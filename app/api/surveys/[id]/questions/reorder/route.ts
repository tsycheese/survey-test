import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/prisma"
import { z } from "zod"
import {
  pusherServer,
  getSurveyChannel,
  COLLABORATION_EVENTS,
} from "@/lib/pusher"

const reorderSchema = z.object({
  questions: z.array(
    z.object({
      id: z.string(),
      order: z.number().int().nonnegative(),
    })
  ),
})

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
  const parsed = reorderSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0].message },
      { status: 400 }
    )
  }

  // 批量更新题目顺序
  await prisma.$transaction(
    parsed.data.questions.map((q) =>
      prisma.question.update({
        where: { id: q.id },
        data: { order: q.order },
      })
    )
  )

  // 触发实时同步事件
  await pusherServer.trigger(
    getSurveyChannel(id),
    COLLABORATION_EVENTS.QUESTIONS_REORDERED,
    {
      questions: parsed.data.questions.map((q) => ({
        id: q.id,
        order: q.order,
      })),
      fromUserId: session.user.id,
      timestamp: new Date().toISOString(),
    }
  )

  return NextResponse.json({ success: true })
}
