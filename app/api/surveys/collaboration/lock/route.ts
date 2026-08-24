import { auth } from "@/lib/auth"
import { scheduleSurveyBroadcast } from "@/lib/realtime-broadcast"
import { COLLABORATION_EVENTS } from "@/lib/realtime-shared"
import { prisma } from "@/prisma"
import { NextResponse } from "next/server"
import { z } from "zod"

const lockQuestionSchema = z.object({
  surveyId: z.string().min(1),
  questionId: z.string().min(1),
})

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

    const body = await request.json().catch(() => null)
    const parsed = lockQuestionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "缺少必要参数" }, { status: 400 })
    }
    const { surveyId, questionId } = parsed.data

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

    const lockedAt = new Date()

    // 将所属问卷校验和抢锁条件放进同一次写入，避免“先检查、后更新”的竞态。
    const updateResult = await prisma.question.updateMany({
      where: {
        id: questionId,
        surveyId,
        OR: [{ lockedBy: null }, { lockedBy: session.user.id }],
      },
      data: {
        lockedBy: session.user.id,
        lockedAt,
      },
    })

    if (updateResult.count === 0) {
      const question = await prisma.question.findFirst({
        where: { id: questionId, surveyId },
        select: { lockedBy: true, lockedAt: true },
      })

      if (!question) {
        return NextResponse.json({ error: "题目不存在" }, { status: 404 })
      }

      if (!question.lockedBy) {
        return NextResponse.json(
          { error: "题目锁状态已发生变化，请重试" },
          { status: 409 }
        )
      }

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

    // 获取用户信息
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true },
    })

    // 数据库锁定成功即可响应；实时通知在响应后发送。
    scheduleSurveyBroadcast({
      surveyId,
      event: COLLABORATION_EVENTS.QUESTION_LOCKED,
      operation: "question-lock",
      payload: {
        questionId,
        userId: session.user.id,
        userName: user?.name,
        lockedAt: lockedAt.toISOString(),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Lock question error:", error)
    return NextResponse.json({ error: "锁定题目失败" }, { status: 500 })
  }
}
