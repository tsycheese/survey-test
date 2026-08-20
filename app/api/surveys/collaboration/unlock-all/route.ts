import { auth } from "@/lib/auth"
import { scheduleSurveyBroadcast } from "@/lib/realtime-broadcast"
import { COLLABORATION_EVENTS } from "@/lib/realtime-shared"
import { prisma } from "@/prisma"
import { NextResponse } from "next/server"

/**
 * POST /api/surveys/collaboration/unlock-all
 * 解锁用户所有锁定的题目（用于异常退出恢复）
 */
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未登录" }, { status: 401 })
    }

    const { surveyId, userId } = await request.json()

    if (!surveyId) {
      return NextResponse.json({ error: "缺少问卷ID" }, { status: 400 })
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

    const targetUserId = userId || session.user.id

    // 解锁该用户所有锁定的题目
    await prisma.question.updateMany({
      where: {
        surveyId,
        lockedBy: targetUserId,
      },
      data: {
        lockedBy: null,
        lockedAt: null,
      },
    })

    // 数据库解锁成功即可响应；实时通知在响应后发送。
    scheduleSurveyBroadcast({
      surveyId,
      event: COLLABORATION_EVENTS.QUESTIONS_UNLOCK_ALL,
      operation: "questions-unlock-all",
      payload: {
        userId: targetUserId,
        unlockedBy: session.user.id,
        unlockedAt: new Date().toISOString(),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Unlock all questions error:", error)
    return NextResponse.json({ error: "解锁题目失败" }, { status: 500 })
  }
}
