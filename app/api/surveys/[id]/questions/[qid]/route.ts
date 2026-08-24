import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/prisma"
import { z } from "zod"
import { scheduleSurveyBroadcast } from "@/lib/realtime-broadcast"
import {
  COLLABORATION_EVENTS,
  getRealtimeClientIdFromRequest,
} from "@/lib/realtime-shared"

const updateQuestionSchema = z.object({
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
  order: z.number().int().optional(),
})

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

  const question = await prisma.question.update({
    where: { id: qid, surveyId: id },
    data: parsed.data,
  })

  // 数据库更新成功即可响应；实时通知在响应后发送。
  scheduleSurveyBroadcast({
    surveyId: id,
    event: COLLABORATION_EVENTS.QUESTION_UPDATED,
    operation: "question-update",
    payload: {
      questionId: qid,
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

  await prisma.question.delete({ where: { id: qid, surveyId: id } })

  // 数据库删除成功即可响应；实时通知在响应后发送。
  scheduleSurveyBroadcast({
    surveyId: id,
    event: COLLABORATION_EVENTS.QUESTION_DELETED,
    operation: "question-delete",
    payload: {
      questionId: qid,
      fromUserId: userId,
      clientId: getRealtimeClientIdFromRequest(request),
    },
  })

  return NextResponse.json({ message: "删除成功" })
}
