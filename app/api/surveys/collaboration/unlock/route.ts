import { auth } from "@/lib/auth"
import { scheduleSurveyBroadcast } from "@/lib/realtime-broadcast"
import {
  COLLABORATION_EVENTS,
  getRealtimeClientIdFromRequest,
  getRealtimeRequestIdFromRequest,
} from "@/lib/realtime-shared"
import { prisma } from "@/prisma"
import { clearedQuestionLock } from "@/lib/question-locks"
import { NextResponse } from "next/server"
import { z } from "zod"

const unlockQuestionSchema = z.object({
  surveyId: z.string().min(1),
  questionId: z.string().min(1),
  lockId: z.string().min(1),
})

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

    const body = await request.json().catch(() => null)
    const parsed = unlockQuestionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "缺少必要参数" }, { status: 400 })
    }
    const { surveyId, questionId, lockId } = parsed.data
    const clientId = getRealtimeClientIdFromRequest(request)
    if (!clientId) {
      return NextResponse.json({ error: "缺少客户端ID" }, { status: 400 })
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

    // 只允许当前租约持有人释放精确的租约代际。延迟到达的旧请求不会误伤新锁。
    const updateResult = await prisma.question.updateMany({
      where: {
        id: questionId,
        surveyId,
        lockedBy: session.user.id,
        lockClientId: clientId,
        lockId,
      },
      data: clearedQuestionLock,
    })

    if (updateResult.count === 0) {
      const question = await prisma.question.findFirst({
        where: { id: questionId, surveyId },
        select: { id: true },
      })

      if (!question) {
        return NextResponse.json({ error: "题目不存在" }, { status: 404 })
      }

      // 已过期、已释放或已被新租约替代时视为幂等成功。
      return NextResponse.json({ success: true, released: false })
    }

    // 数据库解锁成功即可响应；实时通知在响应后发送。
    scheduleSurveyBroadcast({
      surveyId,
      event: COLLABORATION_EVENTS.QUESTION_UNLOCKED,
      operation: "question-unlock",
      requestId: getRealtimeRequestIdFromRequest(request),
      payload: {
        questionId,
        lockId,
        userId: session.user.id,
        unlockedAt: new Date().toISOString(),
        clientId,
      },
    })

    return NextResponse.json({ success: true, released: true })
  } catch (error) {
    console.error("Unlock question error:", error)
    return NextResponse.json({ error: "解锁题目失败" }, { status: 500 })
  }
}
