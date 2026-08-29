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
import { logPerformance } from "@/lib/performance-logging"
import {
  formatPerformanceTimings,
  formatServerTiming,
  measurePerformance,
  type PerformanceTimings,
} from "@/lib/server-performance"

const updateSurveySchema = z.object({
  expectedDetailsRevision: z.number().int().nonnegative(),
  title: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  settings: z.record(z.boolean()).optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId =
    getRealtimeRequestIdFromRequest(request) ?? crypto.randomUUID()
  const requestStartedAt = performance.now()
  const timings: PerformanceTimings = {}
  const vercelId = request.headers.get("x-vercel-id") ?? "local"

  const session = await measurePerformance(timings, "auth", () => auth())
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 })
  }

  const { id } = await params
  const userId = session.user.id

  // 先尝试查找问卷（不限制 userId，可能是协作者访问）
  const survey = await measurePerformance(timings, "database", () =>
    prisma.survey.findUnique({
      where: { id },
      include: {
        questions: {
          orderBy: { order: "asc" },
          select: {
            id: true,
            title: true,
            description: true,
            type: true,
            order: true,
            required: true,
            config: true,
            revision: true,
            lockedBy: true,
            lockedAt: true,
          },
        },
        _count: { select: { responses: true } },
        collaborators: {
          where: { userId },
          select: { id: true },
        },
      },
    })
  )

  if (!survey) {
    return NextResponse.json({ error: "问卷不存在" }, { status: 404 })
  }

  // 检查是否是创建者或协作者
  const isOwner = survey.userId === userId
  const isCollaborator = survey.collaborators.length > 0

  if (!isOwner && !isCollaborator) {
    return NextResponse.json({ error: "无权限访问" }, { status: 403 })
  }

  timings.total = performance.now() - requestStartedAt
  logPerformance("[Survey Snapshot Performance]", {
    requestId,
    vercelId,
    questionCount: survey.questions.length,
    ...formatPerformanceTimings(timings),
  })

  return NextResponse.json(
    {
      ...survey,
      settings: survey.settings ?? { showQuestionNumber: true },
    },
    {
      headers: {
        "Server-Timing": formatServerTiming(timings),
        "X-Request-Id": requestId,
      },
    }
  )
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 })
  }

  const { id } = await params
  const userId = session.user.id
  const body = await request.json()
  const parsed = updateSurveySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0].message },
      { status: 400 }
    )
  }

  const result = await prisma.$transaction(async (tx) => {
    const lockedRows = await tx.$queryRaw<
      Array<{ id: string; detailsRevision: number }>
    >`
      SELECT "id", "detailsRevision"
      FROM "Survey"
      WHERE "id" = ${id}
      FOR UPDATE
    `
    const locked = lockedRows[0]
    if (!locked) return { kind: "not-found" } as const

    const existing = await tx.survey.findUnique({
      where: { id },
      include: {
        collaborators: {
          where: { userId },
          select: { canEdit: true },
        },
      },
    })
    if (!existing) return { kind: "not-found" } as const

    const isOwner = existing.userId === userId
    const canEdit = isOwner || existing.collaborators[0]?.canEdit
    if (!canEdit) return { kind: "forbidden" } as const

    if (locked.detailsRevision !== parsed.data.expectedDetailsRevision) {
      return {
        kind: "conflict",
        current: {
          title: existing.title,
          description: existing.description,
          settings: existing.settings,
          detailsRevision: existing.detailsRevision,
        },
      } as const
    }

    const survey = await tx.survey.update({
      where: { id },
      data: {
        ...(parsed.data.title !== undefined
          ? { title: parsed.data.title }
          : {}),
        ...(parsed.data.description !== undefined
          ? { description: parsed.data.description }
          : {}),
        ...(parsed.data.settings !== undefined
          ? { settings: parsed.data.settings }
          : {}),
        detailsRevision: { increment: 1 },
      },
    })

    return { kind: "updated", survey } as const
  })

  if (result.kind === "not-found") {
    return NextResponse.json({ error: "问卷不存在" }, { status: 404 })
  }
  if (result.kind === "forbidden") {
    return NextResponse.json({ error: "无权限编辑" }, { status: 403 })
  }
  if (result.kind === "conflict") {
    return NextResponse.json(
      {
        error: "问卷信息已被其他协作者更新",
        code: "SURVEY_DETAILS_REVISION_CONFLICT",
        current: result.current,
      },
      { status: 409 }
    )
  }

  const { survey } = result

  // 数据库更新成功即可响应；实时通知在响应后发送。
  scheduleSurveyBroadcast({
    surveyId: id,
    event: COLLABORATION_EVENTS.SURVEY_UPDATED,
    operation: "survey-update",
    requestId: getRealtimeRequestIdFromRequest(request),
    payload: {
      survey: {
        title: survey.title,
        description: survey.description,
        settings: survey.settings as Record<string, unknown>,
        detailsRevision: survey.detailsRevision,
      },
      fromUserId: session.user.id,
      clientId: getRealtimeClientIdFromRequest(request),
    },
  })

  return NextResponse.json(survey)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 })
  }

  const { id } = await params
  const existing = await prisma.survey.findUnique({
    where: { id, userId: session.user.id },
  })
  if (!existing) {
    return NextResponse.json({ error: "问卷不存在" }, { status: 404 })
  }

  await prisma.survey.delete({ where: { id } })
  return NextResponse.json({ message: "删除成功" })
}
