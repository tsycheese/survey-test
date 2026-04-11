import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/prisma"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 })
  }

  const { id } = await params
  const { searchParams } = new URL(request.url)
  const versionId = searchParams.get("versionId")

  const survey = await prisma.survey.findUnique({
    where: { id, userId: session.user.id },
    include: {
      versions: {
        orderBy: { version: "desc" },
        select: { id: true, version: true },
      },
    },
  })
  if (!survey) {
    return NextResponse.json({ error: "问卷不存在" }, { status: 404 })
  }

  // 如果指定了版本ID，使用该版本的题目数据
  let questions: {
    id: string
    title: string
    type: string
    config: unknown
  }[] = []

  if (versionId) {
    const version = await prisma.surveyVersion.findUnique({
      where: { id: versionId },
    })
    if (version && version.surveyId === id) {
      questions = version.questions as {
        id: string
        title: string
        type: string
        config: unknown
      }[]
    }
  }

  // 如果没有找到版本数据，使用当前题目
  if (questions.length === 0) {
    const dbQuestions = await prisma.question.findMany({
      where: { surveyId: id },
      orderBy: { order: "asc" },
    })
    questions = dbQuestions.map(
      (q: { id: string; title: string; type: string; config: unknown }) => ({
        id: q.id,
        title: q.title,
        type: q.type,
        config: q.config,
      })
    )
  }

  // 构建查询条件
  const where: { surveyId: string; versionId?: string } = { surveyId: id }
  if (versionId) {
    where.versionId = versionId
  }

  const responses = await prisma.response.findMany({
    where,
    include: { answers: true },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({
    survey: { title: survey.title, description: survey.description },
    totalResponses: responses.length,
    versions: survey.versions,
    currentVersionId: versionId || survey.currentVersionId,
    questions: questions.map(
      (q: { id: string; title: string; type: string; config: unknown }) => ({
        id: q.id,
        title: q.title,
        type: q.type,
        config: q.config,
        answers: responses.flatMap(
          (r: { answers: { questionId: string; value: unknown }[] }) =>
            r.answers
              .filter((a: { questionId: string }) => a.questionId === q.id)
              .map((a: { value: unknown }) => ({ value: a.value }))
        ),
      })
    ),
  })
}
