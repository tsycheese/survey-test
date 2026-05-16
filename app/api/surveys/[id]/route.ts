import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/prisma"
import { z } from "zod"
import {
  pusherServer,
  getSurveyChannel,
  COLLABORATION_EVENTS,
} from "@/lib/pusher"

const updateSurveySchema = z.object({
  title: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  settings: z.record(z.boolean()).optional(),
})

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 })
  }

  const { id } = await params
  const userId = session.user.id

  // 先尝试查找问卷（不限制 userId，可能是协作者访问）
  const survey = await prisma.survey.findUnique({
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

  if (!survey) {
    return NextResponse.json({ error: "问卷不存在" }, { status: 404 })
  }

  // 检查是否是创建者或协作者
  const isOwner = survey.userId === userId
  const isCollaborator = survey.collaborators.length > 0

  if (!isOwner && !isCollaborator) {
    return NextResponse.json({ error: "无权限访问" }, { status: 403 })
  }

  return NextResponse.json({
    ...survey,
    settings: survey.settings ?? { showQuestionNumber: true },
  })
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

  const existing = await prisma.survey.findUnique({
    where: { id },
    include: {
      collaborators: {
        where: { userId },
        select: { canEdit: true },
      },
    },
  })

  if (!existing) {
    return NextResponse.json({ error: "问卷不存在" }, { status: 404 })
  }

  const isOwner = existing.userId === userId
  const canEdit = isOwner || existing.collaborators[0]?.canEdit

  if (!canEdit) {
    return NextResponse.json({ error: "无权限编辑" }, { status: 403 })
  }

  const survey = await prisma.survey.update({
    where: { id },
    data: parsed.data,
  })

  // 触发实时同步事件
  await pusherServer.trigger(
    getSurveyChannel(id),
    COLLABORATION_EVENTS.SURVEY_UPDATED,
    {
      survey: {
        title: survey.title,
        description: survey.description,
        settings: survey.settings as Record<string, unknown>,
      },
      fromUserId: session.user.id,
      timestamp: new Date().toISOString(),
    }
  )

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
