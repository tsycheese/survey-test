import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/prisma"
import { questionMutationSchema } from "@/lib/questions/mutation-schema"
import {
  COLLABORATION_EVENTS,
  getRealtimeClientIdFromRequest,
  getRealtimeRequestIdFromRequest,
} from "@/lib/realtime-shared"
import { scheduleSurveyBroadcast } from "@/lib/realtime-broadcast"
import { logPerformance } from "@/lib/performance-logging"

type PerformanceTimings = Record<string, number>

async function measure<T>(
  timings: PerformanceTimings,
  name: string,
  action: () => Promise<T>
): Promise<T> {
  const startedAt = performance.now()

  try {
    return await action()
  } finally {
    timings[name] = performance.now() - startedAt
  }
}

function formatServerTiming(timings: PerformanceTimings): string {
  return Object.entries(timings)
    .map(([name, duration]) => `${name};dur=${duration.toFixed(1)}`)
    .join(", ")
}

class SurveyChangedDuringCreateError extends Error {}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId =
    getRealtimeRequestIdFromRequest(request) ?? crypto.randomUUID()
  const clientId = getRealtimeClientIdFromRequest(request)
  const requestStartedAt = performance.now()
  const timings: PerformanceTimings = {}

  const session = await measure(timings, "auth", () => auth())
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 })
  }

  const { id } = await params
  const userId = session.user.id

  const survey = await measure(timings, "permission", () =>
    prisma.survey.findUnique({
      where: { id },
      select: {
        userId: true,
      },
    })
  )

  if (!survey) {
    return NextResponse.json({ error: "问卷不存在" }, { status: 404 })
  }

  const isOwner = survey.userId === userId
  let canEdit = isOwner

  if (!isOwner) {
    const collaborator = await measure(timings, "collaboratorLookup", () =>
      prisma.surveyCollaborator.findUnique({
        where: {
          surveyId_userId: {
            surveyId: id,
            userId,
          },
        },
        select: { canEdit: true },
      })
    )
    canEdit = collaborator?.canEdit ?? false
  }

  if (!canEdit) {
    return NextResponse.json({ error: "无权限编辑" }, { status: 403 })
  }

  const body = await measure(timings, "body", () => request.json())
  const parsed = questionMutationSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0].message },
      { status: 400 }
    )
  }

  const operationId = parsed.data.operationId
  let persistedResult: {
    question: Awaited<ReturnType<typeof prisma.question.create>>
    replayed: boolean
    structureRevision: number
  }

  try {
    persistedResult = await measure(timings, "database", () =>
      prisma.$transaction(async (tx) => {
        // 创建与重排共用问卷行锁，确保 count、移位和写入基于同一顺序快照。
        const lockedSurveys = await tx.$queryRaw<Array<{ id: string }>>`
          SELECT "id" FROM "Survey" WHERE "id" = ${id} FOR UPDATE
        `
        if (lockedSurveys.length === 0) {
          throw new SurveyChangedDuringCreateError()
        }

        const existingQuestion = await tx.question.findUnique({
          where: {
            surveyId_clientMutationId: {
              surveyId: id,
              clientMutationId: operationId,
            },
          },
        })
        if (existingQuestion) {
          const currentSurvey = await tx.survey.findUniqueOrThrow({
            where: { id },
            select: { structureRevision: true },
          })
          return {
            question: existingQuestion,
            replayed: true,
            structureRevision: currentSurvey.structureRevision,
          }
        }

        const count = await tx.question.count({ where: { surveyId: id } })
        const targetOrder = parsed.data.order ?? count
        const finalOrder = targetOrder < count ? targetOrder : count

        if (targetOrder < count) {
          await tx.question.updateMany({
            where: {
              surveyId: id,
              order: { gte: targetOrder },
            },
            data: {
              order: { increment: 1 },
            },
          })
        }

        const question = await tx.question.create({
          data: {
            surveyId: id,
            clientMutationId: operationId,
            title: parsed.data.title,
            description: parsed.data.description,
            type: parsed.data.type,
            required: parsed.data.required,
            config: parsed.data.config ?? {},
            order: finalOrder,
          },
        })

        const updatedSurvey = await tx.survey.update({
          where: { id },
          data: { structureRevision: { increment: 1 } },
          select: { structureRevision: true },
        })

        return {
          question,
          replayed: false,
          structureRevision: updatedSurvey.structureRevision,
        }
      })
    )
  } catch (error) {
    if (error instanceof SurveyChangedDuringCreateError) {
      return NextResponse.json({ error: "问卷不存在" }, { status: 404 })
    }
    throw error
  }

  const { question, replayed, structureRevision } = persistedResult

  // 幂等重放不再次广播，避免协作者收到重复的题目创建事件。
  if (!replayed) {
    scheduleSurveyBroadcast({
      surveyId: id,
      event: COLLABORATION_EVENTS.QUESTION_CREATED,
      operation: "question-create",
      requestId,
      payload: {
        clientId,
        operationId,
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
        structureRevision,
        fromUserId: userId,
      },
    })
  }

  timings.total = performance.now() - requestStartedAt

  logPerformance("[Question Create Performance]", {
    requestId,
    operationId,
    replayed,
    ...Object.fromEntries(
      Object.entries(timings).map(([name, duration]) => [
        name,
        `${duration.toFixed(1)}ms`,
      ])
    ),
  })

  return NextResponse.json(
    { ...question, structureRevision },
    {
      status: replayed ? 200 : 201,
      headers: {
        "Server-Timing": formatServerTiming(timings),
        "X-Request-Id": requestId,
        "X-Idempotent-Replay": replayed ? "true" : "false",
      },
    }
  )
}
