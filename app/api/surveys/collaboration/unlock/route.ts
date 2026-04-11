import { auth } from "@/lib/auth"
import {
  pusherServer,
  getSurveyChannel,
  COLLABORATION_EVENTS,
} from "@/lib/pusher"
import { prisma } from "@/prisma"
import { NextResponse } from "next/server"

/**
 * POST /api/surveys/collaboration/unlock
 * 解锁题目
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

    // 检查题目锁定状态
    const question = await prisma.question.findUnique({
      where: { id: questionId },
    })

    if (!question) {
      return NextResponse.json({ error: "题目不存在" }, { status: 404 })
    }

    // 只能解锁自己锁定的题目（所有者可以解锁所有）
    if (
      question.lockedBy &&
      question.lockedBy !== session.user.id &&
      !isOwner
    ) {
      return NextResponse.json(
        { error: "不能解锁其他用户的题目" },
        { status: 403 }
      )
    }

    // 解锁题目
    await prisma.question.update({
      where: { id: questionId },
      data: {
        lockedBy: null,
        lockedAt: null,
      },
    })

    // 触发解锁事件
    const channel = getSurveyChannel(surveyId)
    await pusherServer.trigger(
      channel,
      COLLABORATION_EVENTS.QUESTION_UNLOCKED,
      {
        questionId,
        userId: session.user.id,
        unlockedAt: new Date().toISOString(),
      }
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Unlock question error:", error)
    return NextResponse.json({ error: "解锁题目失败" }, { status: 500 })
  }
}
