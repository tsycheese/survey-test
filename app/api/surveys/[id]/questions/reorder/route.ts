import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/prisma"
import { z } from "zod"
import { scheduleSurveyBroadcast } from "@/lib/realtime-broadcast"
import {
  COLLABORATION_EVENTS,
  getRealtimeClientIdFromRequest,
} from "@/lib/realtime-shared"

const reorderSchema = z
  .object({
    questions: z
      .array(
        z.object({
          id: z.string().min(1),
          order: z.number().int().nonnegative(),
        })
      )
      .min(1),
  })
  .refine(
    ({ questions }) =>
      new Set(questions.map((question) => question.id)).size ===
      questions.length,
    { message: "题目ID不能重复", path: ["questions"] }
  )
  .refine(
    ({ questions }) =>
      new Set(questions.map((question) => question.order)).size ===
      questions.length,
    { message: "题目顺序不能重复", path: ["questions"] }
  )
  .refine(
    ({ questions }) =>
      [...questions]
        .sort((a, b) => a.order - b.order)
        .every((question, index) => question.order === index),
    { message: "题目顺序必须从0开始连续排列", path: ["questions"] }
  )

class ReorderConflictError extends Error {}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 })
  }

  const { id } = await params
  const userId = session.user.id

  const survey = await prisma.survey.findUnique({
    where: { id },
    include: {
      collaborators: {
        where: { userId },
        select: { canEdit: true },
      },
    },
  })

  if (!survey) {
    return NextResponse.json({ error: "问卷不存在" }, { status: 404 })
  }

  const isOwner = survey.userId === userId
  const canEdit = isOwner || survey.collaborators[0]?.canEdit

  if (!canEdit) {
    return NextResponse.json({ error: "无权限编辑" }, { status: 403 })
  }

  const body = await request.json()
  const parsed = reorderSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0].message },
      { status: 400 }
    )
  }

  try {
    await prisma.$transaction(async (tx) => {
      // 同一问卷的重排请求串行执行，避免两次事务交错写出混合顺序。
      await tx.$queryRaw`SELECT "id" FROM "Survey" WHERE "id" = ${id} FOR UPDATE`

      const persistedQuestions = await tx.question.findMany({
        where: { surveyId: id },
        select: { id: true },
      })
      const requestedIds = new Set(
        parsed.data.questions.map((question) => question.id)
      )
      const isCompleteQuestionSet =
        persistedQuestions.length === requestedIds.size &&
        persistedQuestions.every((question) => requestedIds.has(question.id))

      if (!isCompleteQuestionSet) {
        throw new ReorderConflictError()
      }

      // 使用稳定的 ID 顺序获取行锁，降低并发重排发生数据库死锁的概率。
      const updates = [...parsed.data.questions].sort((a, b) =>
        a.id.localeCompare(b.id)
      )

      for (const question of updates) {
        const updateResult = await tx.question.updateMany({
          where: {
            id: question.id,
            surveyId: id,
          },
          data: { order: question.order },
        })

        if (updateResult.count !== 1) {
          throw new ReorderConflictError()
        }
      }
    })
  } catch (error) {
    if (error instanceof ReorderConflictError) {
      return NextResponse.json(
        { error: "题目列表已发生变化，请刷新后重试" },
        { status: 409 }
      )
    }
    throw error
  }

  // 数据库排序成功即可响应；实时通知在响应后发送。
  scheduleSurveyBroadcast({
    surveyId: id,
    event: COLLABORATION_EVENTS.QUESTIONS_REORDERED,
    operation: "questions-reorder",
    payload: {
      questions: parsed.data.questions.map((q) => ({
        id: q.id,
        order: q.order,
      })),
      fromUserId: session.user.id,
      clientId: getRealtimeClientIdFromRequest(request),
    },
  })

  return NextResponse.json({ success: true })
}
