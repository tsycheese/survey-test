import { after, NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/prisma"
import { z } from "zod"
import {
  pusherServer,
  getSurveyChannel,
  COLLABORATION_EVENTS,
} from "@/lib/pusher"

const questionSchema = z.object({
  title: z.string().min(1, "题目不能为空"),
  description: z.string().optional(),
  type: z.enum([
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
  ]),
  required: z.boolean().default(false),
  order: z.number().int().nonnegative().optional(),
  config: z
    .record(z.unknown())
    .optional()
    .transform(
      (v) =>
        v as
          | import("@/prisma/generated/prisma/client").Prisma.InputJsonValue
          | undefined
    ),
})

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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID()
  const requestStartedAt = performance.now()
  const timings: PerformanceTimings = {}

  const session = await measure(timings, "auth", () => auth())
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 })
  }

  const { id } = await params
  const userId = session.user.id

  const survey = await measure(timings, "permissionAndCount", () =>
    prisma.survey.findUnique({
      where: { id },
      select: {
        userId: true,
        _count: {
          select: { questions: true },
        },
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
  const parsed = questionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0].message },
      { status: 400 }
    )
  }

  const count = survey._count.questions
  const targetOrder = parsed.data.order ?? count
  const finalOrder = targetOrder < count ? targetOrder : count

  const questionData = {
    surveyId: id,
    title: parsed.data.title,
    description: parsed.data.description,
    type: parsed.data.type,
    required: parsed.data.required,
    config: parsed.data.config ?? {},
    order: finalOrder,
  }

  // 末尾追加走单次写入快路径；只有中间插入才需要原子移位事务。
  const question = await measure(timings, "database", () =>
    targetOrder < count
      ? prisma.$transaction(async (tx) => {
          await tx.question.updateMany({
            where: {
              surveyId: id,
              order: { gte: targetOrder },
            },
            data: {
              order: { increment: 1 },
            },
          })

          return tx.question.create({ data: questionData })
        })
      : prisma.question.create({ data: questionData })
  )

  const eventPayload = {
    question: {
      id: question.id,
      type: question.type,
      title: question.title,
      description: question.description ?? undefined,
      required: question.required,
      order: question.order,
      config: question.config as Record<string, unknown>,
    },
    fromUserId: userId,
    timestamp: new Date().toISOString(),
  }

  // 当前用户无需等待第三方广播；失败会记录，协作者刷新/重连后仍以数据库为准。
  after(async () => {
    const pusherStartedAt = performance.now()

    try {
      await pusherServer.trigger(
        getSurveyChannel(id),
        COLLABORATION_EVENTS.QUESTION_CREATED,
        eventPayload
      )
      console.info("[Question Create Pusher Performance]", {
        requestId,
        duration: `${(performance.now() - pusherStartedAt).toFixed(1)}ms`,
      })
    } catch (error) {
      console.error("[Question Create Pusher Error]", { requestId, error })
    }
  })

  timings.total = performance.now() - requestStartedAt

  console.info("[Question Create Performance]", {
    requestId,
    ...Object.fromEntries(
      Object.entries(timings).map(([name, duration]) => [
        name,
        `${duration.toFixed(1)}ms`,
      ])
    ),
  })

  return NextResponse.json(question, {
    status: 201,
    headers: {
      "Server-Timing": formatServerTiming(timings),
      "X-Request-Id": requestId,
    },
  })
}
