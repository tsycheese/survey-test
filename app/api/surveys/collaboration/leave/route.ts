import { auth } from "@/lib/auth"
import { prisma } from "@/prisma"
import { NextResponse } from "next/server"

/**
 * POST /api/surveys/collaboration/leave
 * 用户离开问卷协作（仅用于解锁题目和日志记录）
 * Presence Channel 自动处理成员离开事件
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

    // 记录日志（可选，Presence Channel 已处理成员管理）
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
