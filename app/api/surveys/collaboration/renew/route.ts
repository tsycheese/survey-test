import { auth } from "@/lib/auth"
import {
  getQuestionLockExpiry,
  isQuestionLockActive,
  serializeQuestionLock,
} from "@/lib/question-locks"
import { scheduleSurveyBroadcast } from "@/lib/realtime-broadcast"
import {
  COLLABORATION_EVENTS,
  getRealtimeClientIdFromRequest,
  getRealtimeRequestIdFromRequest,
} from "@/lib/realtime-shared"
import { prisma } from "@/prisma"
import { NextResponse } from "next/server"
import { z } from "zod"

const renewQuestionLockSchema = z.object({
  surveyId: z.string().min(1),
  questionId: z.string().min(1),
  lockId: z.string().min(1),
})

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未登录" }, { status: 401 })
    }
    const userId = session.user.id

    const body = await request.json().catch(() => null)
    const parsed = renewQuestionLockSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "请求体格式不正确" }, { status: 400 })
    }
    const { surveyId, questionId, lockId } = parsed.data
    const clientId = getRealtimeClientIdFromRequest(request)
    if (!clientId) {
      return NextResponse.json({ error: "缺少客户端ID" }, { status: 400 })
    }

    const survey = await prisma.survey.findUnique({
      where: { id: surveyId },
      include: {
        collaborators: {
          where: { userId, canEdit: true },
          select: { id: true },
        },
      },
    })
    if (!survey) {
      return NextResponse.json({ error: "问卷不存在" }, { status: 404 })
    }
    if (survey.userId !== userId && survey.collaborators.length === 0) {
      return NextResponse.json({ error: "没有编辑权限" }, { status: 403 })
    }

    const result = await prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT "id" FROM "Question"
        WHERE "id" = ${questionId} AND "surveyId" = ${surveyId}
        FOR UPDATE
      `
      if (rows.length === 0) return { kind: "not-found" as const }

      const current = await tx.question.findUniqueOrThrow({
        where: { id: questionId },
        select: {
          id: true,
          lockedBy: true,
          lockedAt: true,
          lockClientId: true,
          lockId: true,
          lockExpiresAt: true,
        },
      })
      const [clock] = await tx.$queryRaw<Array<{ now: Date }>>`
        SELECT CURRENT_TIMESTAMP AS "now"
      `
      const now = clock.now
      if (
        !isQuestionLockActive(current, now) ||
        current.lockedBy !== userId ||
        current.lockClientId !== clientId ||
        current.lockId !== lockId
      ) {
        return { kind: "lost" as const }
      }

      const lock = await tx.question.update({
        where: { id: questionId },
        data: { lockExpiresAt: getQuestionLockExpiry(now) },
        select: {
          id: true,
          lockedBy: true,
          lockedAt: true,
          lockClientId: true,
          lockId: true,
          lockExpiresAt: true,
        },
      })
      return { kind: "renewed" as const, lock, now }
    })

    if (result.kind === "not-found") {
      return NextResponse.json({ error: "题目不存在" }, { status: 404 })
    }
    if (result.kind === "lost") {
      return NextResponse.json(
        { error: "题目租约已失效", code: "QUESTION_LOCK_LEASE_LOST" },
        { status: 409 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    })
    const lock = serializeQuestionLock(
      result.lock,
      user?.name ?? null,
      result.now
    )
    if (!lock) {
      return NextResponse.json({ error: "题目续租失败" }, { status: 500 })
    }

    scheduleSurveyBroadcast({
      surveyId,
      event: COLLABORATION_EVENTS.QUESTION_LOCK_RENEWED,
      operation: "question-lock-renew",
      requestId: getRealtimeRequestIdFromRequest(request),
      payload: { ...lock, clientId },
    })

    return NextResponse.json({ success: true, lock })
  } catch (error) {
    console.error("Renew question lock error:", error)
    return NextResponse.json({ error: "题目续租失败" }, { status: 500 })
  }
}
