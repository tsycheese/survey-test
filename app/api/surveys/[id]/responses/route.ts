import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/prisma"

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0]
}

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

  // ===== 聚合统计 =====

  // 1. 浏览量
  const totalViews = await prisma.surveyView.count({
    where: { surveyId: id },
  })

  // 2. 回收率
  const completionRate =
    totalViews > 0 ? (responses.length / totalViews) * 100 : 0

  // 3. 平均完成时间（秒）
  const completedResponses = responses.filter(
    (r) => r.startedAt && r.completedAt
  )
  const avgCompletionTime =
    completedResponses.length > 0
      ? completedResponses.reduce((sum, r) => {
          const duration =
            new Date(r.completedAt!).getTime() -
            new Date(r.startedAt!).getTime()
          return sum + duration / 1000
        }, 0) / completedResponses.length
      : 0

  // 4. 设备统计 + 地域统计
  const deviceStats: Record<string, number> = {}
  const osStats: Record<string, number> = {}
  const browserStats: Record<string, number> = {}
  const sourceStats: Record<string, number> = {}
  const locationStats: Record<string, number> = {}
  const countryStats: Record<string, number> = {}

  responses.forEach((r) => {
    if (r.deviceType) {
      deviceStats[r.deviceType] = (deviceStats[r.deviceType] || 0) + 1
    }
    if (r.os) {
      osStats[r.os] = (osStats[r.os] || 0) + 1
    }
    if (r.browser) {
      browserStats[r.browser] = (browserStats[r.browser] || 0) + 1
    }
    if (r.source) {
      sourceStats[r.source] = (sourceStats[r.source] || 0) + 1
    }
    if (r.province) {
      locationStats[r.province] = (locationStats[r.province] || 0) + 1
    }
    if (r.country) {
      countryStats[r.country] = (countryStats[r.country] || 0) + 1
    }
  })

  // 5. 每日趋势（最近 30 天）
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const dailyViews = await prisma.surveyView.groupBy({
    by: ["viewedAt"],
    where: {
      surveyId: id,
      viewedAt: { gte: thirtyDaysAgo },
    },
    _count: { id: true },
  })

  const dailyResponses = await prisma.response.groupBy({
    by: ["createdAt"],
    where: {
      surveyId: id,
      createdAt: { gte: thirtyDaysAgo },
      ...(versionId ? { versionId } : {}),
    },
    _count: { id: true },
  })

  // 合并为日期映射
  const dateMap = new Map<
    string,
    { date: string; views: number; responses: number }
  >()

  dailyViews.forEach((v) => {
    const date = formatDate(v.viewedAt)
    const entry = dateMap.get(date) || { date, views: 0, responses: 0 }
    entry.views += v._count.id
    dateMap.set(date, entry)
  })

  dailyResponses.forEach((r) => {
    const date = formatDate(r.createdAt)
    const entry = dateMap.get(date) || { date, views: 0, responses: 0 }
    entry.responses += r._count.id
    dateMap.set(date, entry)
  })

  const dailyTrend = Array.from(dateMap.values()).sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  // 6. 原始回答列表（用于数据详情页）
  const responseList = responses.map((r) => ({
    id: r.id,
    createdAt: r.createdAt,
    startedAt: r.startedAt,
    completedAt: r.completedAt,
    deviceType: r.deviceType,
    os: r.os,
    browser: r.browser,
    source: r.source,
    referrer: r.referrer,
    ip: r.ip,
    country: r.country,
    province: r.province,
    city: r.city,
    answers: r.answers.map((a) => ({
      questionId: a.questionId,
      value: a.value,
    })),
  }))

  return NextResponse.json({
    survey: { title: survey.title, description: survey.description },
    totalResponses: responses.length,
    totalViews,
    completionRate: Math.round(completionRate * 10) / 10,
    avgCompletionTime: Math.round(avgCompletionTime),
    deviceStats: Object.entries(deviceStats).map(([name, count]) => ({
      name,
      count,
    })),
    osStats: Object.entries(osStats).map(([name, count]) => ({
      name,
      count,
    })),
    browserStats: Object.entries(browserStats).map(([name, count]) => ({
      name,
      count,
    })),
    sourceStats: Object.entries(sourceStats).map(([name, count]) => ({
      name,
      count,
    })),
    locationStats: Object.entries(locationStats)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count),
    countryStats: Object.entries(countryStats)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count),
    dailyTrend,
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
    responses: responseList,
  })
}
