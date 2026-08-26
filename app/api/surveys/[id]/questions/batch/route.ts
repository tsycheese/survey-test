import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { scheduleSurveyBroadcast } from "@/lib/realtime-broadcast"
import {
  COLLABORATION_EVENTS,
  getRealtimeClientIdFromRequest,
} from "@/lib/realtime-shared"
import { batchQuestionMutationSchema } from "@/lib/questions/mutation-schema"
import { prisma } from "@/prisma"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 })
  }

  const body = await request.json()
  const parsed = batchQuestionMutationSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0].message },
      { status: 400 }
    )
  }

  const { id } = await params
  const userId = session.user.id
  const { batchId, expectedStructureRevision, questions } = parsed.data
  const operationIds = questions.map((question) => question.operationId)

  const result = await prisma.$transaction(async (tx) => {
    const lockedSurveys = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT "id" FROM "Survey" WHERE "id" = ${id} FOR UPDATE
    `
    if (lockedSurveys.length === 0) {
      return { kind: "not-found" } as const
    }

    const survey = await tx.survey.findUnique({
      where: { id },
      include: {
        collaborators: {
          where: { userId },
          select: { canEdit: true },
        },
      },
    })
    if (!survey) return { kind: "not-found" } as const

    const isOwner = survey.userId === userId
    const canEdit = isOwner || survey.collaborators[0]?.canEdit
    if (!canEdit) return { kind: "forbidden" } as const

    const existingQuestions = await tx.question.findMany({
      where: {
        surveyId: id,
        clientMutationId: { in: operationIds },
      },
    })

    if (existingQuestions.length === questions.length) {
      const existingByOperationId = new Map(
        existingQuestions.map((question) => [
          question.clientMutationId,
          question,
        ])
      )
      return {
        kind: "replayed",
        questions: operationIds.map(
          (operationId) => existingByOperationId.get(operationId)!
        ),
        structureRevision: survey.structureRevision,
      } as const
    }

    if (existingQuestions.length > 0) {
      return { kind: "operation-conflict" } as const
    }

    if (survey.structureRevision !== expectedStructureRevision) {
      return {
        kind: "structure-conflict",
        currentStructureRevision: survey.structureRevision,
      } as const
    }

    const questionCount = await tx.question.count({
      where: { surveyId: id },
    })
    const createdQuestions = []

    for (const [index, question] of questions.entries()) {
      createdQuestions.push(
        await tx.question.create({
          data: {
            surveyId: id,
            clientMutationId: question.operationId,
            title: question.title,
            description: question.description,
            type: question.type,
            required: question.required,
            config: question.config ?? {},
            order: questionCount + index,
          },
        })
      )
    }

    const updatedSurvey = await tx.survey.update({
      where: { id },
      data: { structureRevision: { increment: 1 } },
      select: { structureRevision: true },
    })

    return {
      kind: "created",
      questions: createdQuestions,
      structureRevision: updatedSurvey.structureRevision,
    } as const
  })

  if (result.kind === "not-found") {
    return NextResponse.json({ error: "问卷不存在" }, { status: 404 })
  }
  if (result.kind === "forbidden") {
    return NextResponse.json({ error: "无权限编辑" }, { status: 403 })
  }
  if (result.kind === "operation-conflict") {
    return NextResponse.json(
      {
        error: "批次中的部分题目操作ID已被使用",
        code: "BATCH_OPERATION_CONFLICT",
      },
      { status: 409 }
    )
  }
  if (result.kind === "structure-conflict") {
    return NextResponse.json(
      {
        error: "题目列表已发生变化，请重新生成或重试",
        code: "STRUCTURE_REVISION_CONFLICT",
        currentStructureRevision: result.currentStructureRevision,
      },
      { status: 409 }
    )
  }

  if (result.kind === "created") {
    scheduleSurveyBroadcast({
      surveyId: id,
      event: COLLABORATION_EVENTS.QUESTION_CREATED,
      operation: "questions-batch-create",
      payload: {
        batchId,
        questions: result.questions.map((question) => ({
          id: question.id,
          type: question.type,
          title: question.title,
          description: question.description ?? undefined,
          required: question.required,
          order: question.order,
          revision: question.revision,
          config: question.config as Record<string, unknown>,
        })),
        structureRevision: result.structureRevision,
        fromUserId: userId,
        clientId: getRealtimeClientIdFromRequest(request),
      },
    })
  }

  return NextResponse.json(
    {
      batchId,
      questions: result.questions,
      structureRevision: result.structureRevision,
    },
    {
      status: result.kind === "replayed" ? 200 : 201,
      headers: {
        "X-Idempotent-Replay": result.kind === "replayed" ? "true" : "false",
      },
    }
  )
}
