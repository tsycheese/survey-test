import { auth } from "@/lib/auth"
import { scheduleSurveyBroadcast } from "@/lib/realtime-broadcast"
import {
  COLLABORATION_EVENTS,
  getRealtimeClientIdFromRequest,
  getRealtimeRequestIdFromRequest,
} from "@/lib/realtime-shared"
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

    const body = (await request.json().catch(() => null)) as {
      surveyId?: unknown
      userId?: unknown
    } | null

    if (!body || typeof body.surveyId !== "string") {
      return NextResponse.json({ error: "请求体格式不正确" }, { status: 400 })
    }

    const surveyId = body.surveyId
    const userId = typeof body.userId === "string" ? body.userId : undefined

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
    const updateResult = await prisma.question.updateMany({
      where: {
        surveyId,
        lockedBy: targetUserId,
      },
      data: {
        lockedBy: null,
        lockedAt: null,
      },
    })

    // 重复的成员离开通知可能由多个客户端同时处理；没有实际写入时不重复广播。
    if (updateResult.count > 0) {
      scheduleSurveyBroadcast({
        surveyId,
        event: COLLABORATION_EVENTS.QUESTIONS_UNLOCK_ALL,
        operation: "questions-unlock-all",
        requestId: getRealtimeRequestIdFromRequest(request),
        payload: {
          userId: targetUserId,
          unlockedBy: session.user.id,
          unlockedAt: new Date().toISOString(),
          clientId: getRealtimeClientIdFromRequest(request),
        },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Unlock all questions error:", error)
    return NextResponse.json({ error: "解锁题目失败" }, { status: 500 })
  }
}
