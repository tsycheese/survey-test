import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/prisma"
import { z } from "zod"
import { scheduleSurveyBroadcast } from "@/lib/realtime-broadcast"
import {
  COLLABORATION_EVENTS,
  getRealtimeClientIdFromRequest,
  getRealtimeRequestIdFromRequest,
} from "@/lib/realtime-shared"

const updateQuestionSchema = z.object({
  expectedRevision: z.number().int().nonnegative(),
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  type: z
    .enum([
      "SINGLE_CHOICE",
      "MULTIPLE_CHOICE",
      "TEXT",
      "RATING",
      "DROPDOWN",
      "TEXTAREA",
      "NUMBER",
      "NPS",
      "CES",
      "PHONE",
      "EMAIL",
      "DATETIME",
      "RANKING",
      "GENDER",
      "NAME",
      "BIRTHDAY",
      "MATRIX_SINGLE",
      "IMAGE_SINGLE_CHOICE",
      "IMAGE_MULTIPLE_CHOICE",
    ])
    .optional(),
  required: z.boolean().optional(),
  config: z
    .record(z.unknown())
    .nullable()
    .optional()
    .transform(
      (v) =>
        v as
          | import("@/prisma/generated/prisma/client").Prisma.InputJsonValue
          | undefined
    ),
})

const deleteQuestionSchema = z.object({
  expectedRevision: z.number().int().nonnegative(),
})

function serializeQuestion(question: {
  id: string
  type: string
  title: string
  description: string | null
  required: boolean
  order: number
  revision: number
  config: unknown
}) {
  return {
    id: question.id,
    type: question.type,
    title: question.title,
    description: question.description ?? undefined,
    required: question.required,
    order: question.order,
    revision: question.revision,
    config: question.config as Record<string, unknown>,
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; qid: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 })
  }

  const { id, qid } = await params
  const userId = session.user.id

  // 检查是否是创建者或协作者
  const survey = await prisma.survey.findUnique({
    where: { id },
    include: {
      collaborators: {
        where: { userId },
        select: { canEdit: true },
      },
    },
  })

  if (!survey) {
    return NextResponse.json({ error: "问卷不存在" }, { status: 404 })
  }

  const isOwner = survey.userId === userId
  const canEdit = isOwner || survey.collaborators[0]?.canEdit

  if (!canEdit) {
    return NextResponse.json({ error: "无权限编辑" }, { status: 403 })
  }

  const body = await request.json()
  const parsed = updateQuestionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0].message },
      { status: 400 }
    )
  }

  const { expectedRevision, ...changes } = parsed.data
  const result = await prisma.$transaction(async (tx) => {
    const lockedRows = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT "id" FROM "Question"
      WHERE "id" = ${qid} AND "surveyId" = ${id}
      FOR UPDATE
    `
    if (lockedRows.length === 0) return { kind: "not-found" as const }

    const current = await tx.question.findUniqueOrThrow({ where: { id: qid } })
    if (current.lockedBy && current.lockedBy !== userId) {
      return { kind: "locked" as const, current }
    }
    if (current.revision !== expectedRevision) {
      return { kind: "conflict" as const, current }
    }

    const question = await tx.question.update({
      where: { id: qid },
      data: {
        ...changes,
        revision: { increment: 1 },
      },
    })
    return { kind: "updated" as const, question }
  })

  if (result.kind === "not-found") {
    return NextResponse.json({ error: "题目不存在" }, { status: 404 })
  }
  if (result.kind === "locked") {
    return NextResponse.json(
      {
        error: "题目正在被其他协作者编辑",
        code: "QUESTION_LOCKED",
        current: serializeQuestion(result.current),
      },
      { status: 409 }
    )
  }
  if (result.kind === "conflict") {
    return NextResponse.json(
      {
        error: "题目已被更新，请处理冲突后重试",
        code: "QUESTION_REVISION_CONFLICT",
        current: serializeQuestion(result.current),
      },
      { status: 409 }
    )
  }

  const question = result.question

  // 数据库更新成功即可响应；实时通知在响应后发送。
  scheduleSurveyBroadcast({
    surveyId: id,
    event: COLLABORATION_EVENTS.QUESTION_UPDATED,
    operation: "question-update",
    requestId: getRealtimeRequestIdFromRequest(request),
    payload: {
      questionId: qid,
      question: {
        id: question.id,
        type: question.type,
        title: question.title,
        description: question.description ?? undefined,
        required: question.required,
        order: question.order,
        revision: question.revision,
        config: question.config as Record<string, unknown>,
      },
      fromUserId: userId,
      clientId: getRealtimeClientIdFromRequest(request),
    },
  })

  return NextResponse.json(question)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; qid: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 })
  }

  const { id, qid } = await params
  const userId = session.user.id

  // 检查是否是创建者或协作者
  const survey = await prisma.survey.findUnique({
    where: { id },
    include: {
      collaborators: {
        where: { userId },
        select: { canEdit: true },
      },
    },
  })

  if (!survey) {
    return NextResponse.json({ error: "问卷不存在" }, { status: 404 })
  }

  const isOwner = survey.userId === userId
  const canEdit = isOwner || survey.collaborators[0]?.canEdit

  if (!canEdit) {
    return NextResponse.json({ error: "无权限删除" }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  const parsed = deleteQuestionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0].message },
      { status: 400 }
    )
  }

  const result = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`
      SELECT "id" FROM "Survey" WHERE "id" = ${id} FOR UPDATE
    `
    const lockedRows = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT "id" FROM "Question"
      WHERE "id" = ${qid} AND "surveyId" = ${id}
      FOR UPDATE
    `
    if (lockedRows.length === 0) return { kind: "not-found" as const }

    const current = await tx.question.findUniqueOrThrow({ where: { id: qid } })
    if (current.lockedBy && current.lockedBy !== userId) {
      return { kind: "locked" as const, current }
    }
    if (current.revision !== parsed.data.expectedRevision) {
      return { kind: "conflict" as const, current }
    }

    await tx.question.delete({ where: { id: qid } })
    const updatedSurvey = await tx.survey.update({
      where: { id },
      data: { structureRevision: { increment: 1 } },
      select: { structureRevision: true },
    })
    return {
      kind: "deleted" as const,
      structureRevision: updatedSurvey.structureRevision,
    }
  })

  if (result.kind === "not-found") {
    return NextResponse.json({ error: "题目不存在" }, { status: 404 })
  }
  if (result.kind === "locked") {
    return NextResponse.json(
      { error: "题目正在被其他协作者编辑", code: "QUESTION_LOCKED" },
      { status: 409 }
    )
  }
  if (result.kind === "conflict") {
    return NextResponse.json(
      {
        error: "题目已被更新，请刷新后重试",
        code: "QUESTION_REVISION_CONFLICT",
        current: serializeQuestion(result.current),
      },
      { status: 409 }
    )
  }

  // 数据库删除成功即可响应；实时通知在响应后发送。
  scheduleSurveyBroadcast({
    surveyId: id,
    event: COLLABORATION_EVENTS.QUESTION_DELETED,
    operation: "question-delete",
    requestId: getRealtimeRequestIdFromRequest(request),
    payload: {
      questionId: qid,
      structureRevision: result.structureRevision,
      fromUserId: userId,
      clientId: getRealtimeClientIdFromRequest(request),
    },
  })

  return NextResponse.json({
    message: "删除成功",
    structureRevision: result.structureRevision,
  })
}
