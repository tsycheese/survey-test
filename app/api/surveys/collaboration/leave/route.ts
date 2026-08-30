import { auth } from "@/lib/auth"
import { prisma } from "@/prisma"
import { clearedQuestionLock } from "@/lib/question-locks"
import { scheduleSurveyBroadcast } from "@/lib/realtime-broadcast"
import {
  COLLABORATION_EVENTS,
  getRealtimeClientIdFromRequest,
  getRealtimeRequestIdFromRequest,
} from "@/lib/realtime-shared"
import { NextResponse } from "next/server"
import { z } from "zod"

const leaveCollaborationSchema = z.object({
  surveyId: z.string().min(1),
  leases: z
    .array(
      z.object({
        questionId: z.string().min(1),
        lockId: z.string().min(1),
      })
    )
    .max(10),
})

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

    const body = await request.json().catch(() => null)
    const parsed = leaveCollaborationSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "请求体格式不正确" }, { status: 400 })
    }
    const { surveyId, leases } = parsed.data
    const clientId = getRealtimeClientIdFromRequest(request)
    if (!clientId) {
      return NextResponse.json({ error: "缺少客户端ID" }, { status: 400 })
    }

    const survey = await prisma.survey.findUnique({
      where: { id: surveyId },
      include: {
        collaborators: {
          where: { userId: session.user.id },
          select: { id: true },
        },
      },
    })
    if (!survey) {
      return NextResponse.json({ error: "问卷不存在" }, { status: 404 })
    }
    if (
      survey.userId !== session.user.id &&
      survey.collaborators.length === 0
    ) {
      return NextResponse.json({ error: "没有权限" }, { status: 403 })
    }

    const releasedLeases = [] as typeof leases
    for (const lease of leases) {
      const result = await prisma.question.updateMany({
        where: {
          id: lease.questionId,
          surveyId,
          lockedBy: session.user.id,
          lockClientId: clientId,
          lockId: lease.lockId,
        },
        data: clearedQuestionLock,
      })
      if (result.count > 0) releasedLeases.push(lease)
    }

    // 如果确实解锁了题目，通过 Pusher 通知所有在线客户端
    if (releasedLeases.length > 0) {
      scheduleSurveyBroadcast({
        surveyId,
        event: COLLABORATION_EVENTS.QUESTIONS_UNLOCK_ALL,
        operation: "collaboration-leave-unlock",
        requestId: getRealtimeRequestIdFromRequest(request),
        payload: {
          userId: session.user.id,
          leases: releasedLeases,
          unlockedBy: session.user.id,
          unlockedAt: new Date().toISOString(),
          clientId,
        },
      })
    }

    // 记录日志（可选，Presence Channel 已处理成员管理）
    await prisma.surveyLog.create({
      data: {
        surveyId,
        userId: session.user.id,
        action: "LEAVE_COLLABORATION",
        details: {},
      },
    })

    return NextResponse.json({ success: true, released: releasedLeases.length })
  } catch (error) {
    console.error("Leave collaboration error:", error)
    return NextResponse.json({ error: "离开协作失败" }, { status: 500 })
  }
}
