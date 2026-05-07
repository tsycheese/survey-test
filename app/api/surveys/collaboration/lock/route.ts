import { auth } from "@/lib/auth"
import {
  pusherServer,
  getSurveyChannel,
  COLLABORATION_EVENTS,
} from "@/lib/pusher"
import { prisma } from "@/prisma"
import { NextResponse } from "next/server"

/**
 * POST /api/surveys/collaboration/lock
 * 锁定题目进行编辑
 */
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未登录" }, { status: 401 })
    }

    const { surveyId, questionId } = await request.json()

    if (!surveyId || !questionId) {
      return NextResponse.json({ error: "缺少必要参数" }, { status: 400 })
    }

    // 验证权限
    const survey = await prisma.survey.findUnique({
      where: { id: surveyId },
      include: {
        collaborators: {
          where: { userId: session.user.id },
        },
      },
    })

    if (!survey) {
      return NextResponse.json({ error: "问卷不存在" }, { status: 404 })
    }

    const isOwner = survey.userId === session.user.id
    const isCollaborator = survey.collaborators.some(
      (c: { canEdit: boolean }) => c.canEdit
    )

    if (!isOwner && !isCollaborator) {
      return NextResponse.json({ error: "没有编辑权限" }, { status: 403 })
    }

    // 检查题目是否已被锁定
    const question = await prisma.question.findUnique({
      where: { id: questionId },
    })

    if (!question) {
      return NextResponse.json({ error: "题目不存在" }, { status: 404 })
    }

    if (question.lockedBy && question.lockedBy !== session.user.id) {
      // 获取锁定者信息
      const lockedByUser = await prisma.user.findUnique({
        where: { id: question.lockedBy },
        select: { name: true },
      })

      return NextResponse.json(
        {
          error: "题目已被锁定",
          lockedBy: lockedByUser?.name || "其他用户",
          lockedByUserId: question.lockedBy,
          lockedAt: question.lockedAt,
        },
        { status: 409 }
      )
    }

    // 锁定题目
    await prisma.question.update({
      where: { id: questionId },
      data: {
        lockedBy: session.user.id,
        lockedAt: new Date(),
      },
    })

    // 获取用户信息
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true },
    })

    // 触发锁定事件
    const channel = getSurveyChannel(surveyId)
    await pusherServer.trigger(channel, COLLABORATION_EVENTS.QUESTION_LOCKED, {
      questionId,
      userId: session.user.id,
      userName: user?.name,
      lockedAt: new Date().toISOString(),
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Lock question error:", error)
    return NextResponse.json({ error: "锁定题目失败" }, { status: 500 })
  }
}
