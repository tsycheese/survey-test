import { auth } from "@/lib/auth"
import {
  pusherServer,
  getSurveyChannel,
  COLLABORATION_EVENTS,
} from "@/lib/pusher"
import { prisma } from "@/prisma"
import { NextResponse } from "next/server"

/**
 * POST /api/surveys/collaboration/leave
 * 用户离开问卷协作
 */
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未登录" }, { status: 401 })
    }

    const { surveyId } = await request.json()

    if (!surveyId) {
      return NextResponse.json({ error: "缺少问卷ID" }, { status: 400 })
    }

    // 获取用户信息
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, name: true },
    })

    if (!user) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 })
    }

    // 解锁该用户锁定的所有题目
    await prisma.question.updateMany({
      where: {
        surveyId,
        lockedBy: session.user.id,
      },
      data: {
        lockedBy: null,
        lockedAt: null,
      },
    })

    // 触发成员离开事件
    const channel = getSurveyChannel(surveyId)
    await pusherServer.trigger(channel, COLLABORATION_EVENTS.MEMBER_LEFT, {
      userId: user.id,
      name: user.name,
      leftAt: new Date().toISOString(),
    })

    // 触发解锁所有该用户锁定的题目事件
    await pusherServer.trigger(
      channel,
      COLLABORATION_EVENTS.QUESTIONS_UNLOCK_ALL,
      {
        userId: user.id,
        unlockedAt: new Date().toISOString(),
      }
    )

    // 记录日志
    await prisma.surveyLog.create({
      data: {
        surveyId,
        userId: session.user.id,
        action: "LEAVE_COLLABORATION",
        details: {},
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Leave collaboration error:", error)
    return NextResponse.json({ error: "离开协作失败" }, { status: 500 })
  }
}
