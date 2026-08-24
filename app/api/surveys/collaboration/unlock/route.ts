import { auth } from "@/lib/auth"
import { scheduleSurveyBroadcast } from "@/lib/realtime-broadcast"
import { COLLABORATION_EVENTS } from "@/lib/realtime-shared"
import { prisma } from "@/prisma"
import { NextResponse } from "next/server"
import { z } from "zod"

const unlockQuestionSchema = z.object({
  surveyId: z.string().min(1),
  questionId: z.string().min(1),
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

    // 所有者可以解锁问卷内任意题目；协作者只能解锁未锁定或自己锁定的题目。
    // 所属问卷和锁拥有者都放进写入条件，避免检查后锁状态发生变化。
    const updateResult = await prisma.question.updateMany({
      where: {
        id: questionId,
        surveyId,
        ...(!isOwner
          ? {
              OR: [{ lockedBy: null }, { lockedBy: session.user.id }],
            }
          : {}),
      },
      data: {
        lockedBy: null,
        lockedAt: null,
      },
    })

    if (updateResult.count === 0) {
      const question = await prisma.question.findFirst({
        where: { id: questionId, surveyId },
        select: { id: true },
      })

      if (!question) {
        return NextResponse.json({ error: "题目不存在" }, { status: 404 })
      }

      return NextResponse.json(
        { error: "不能解锁其他用户的题目" },
        { status: 403 }
      )
    }

    // 数据库解锁成功即可响应；实时通知在响应后发送。
    scheduleSurveyBroadcast({
      surveyId,
      event: COLLABORATION_EVENTS.QUESTION_UNLOCKED,
      operation: "question-unlock",
      payload: {
        questionId,
        userId: session.user.id,
        unlockedAt: new Date().toISOString(),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Unlock question error:", error)
    return NextResponse.json({ error: "解锁题目失败" }, { status: 500 })
  }
}
