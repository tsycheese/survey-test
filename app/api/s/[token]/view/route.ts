import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/prisma"
import { lookupIP } from "@/lib/geoip"

/**
 * 记录问卷浏览量
 * 同一 IP 24 小时内多次访问只计一次
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  const survey = await prisma.survey.findUnique({
    where: { shareToken: token, published: true },
    select: { id: true },
  })

  if (!survey) {
    return NextResponse.json({ error: "问卷不存在" }, { status: 404 })
  }

  const ip = request.headers.get("x-forwarded-for") || "unknown"

  // 检查该 IP 24 小时内是否已有记录
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const existing = await prisma.surveyView.findFirst({
    where: {
      surveyId: survey.id,
      ip: ip,
      viewedAt: { gte: oneDayAgo },
    },
  })

  if (!existing) {
    let geo: {
      country: string | null
      province: string | null
      city: string | null
    } = { country: null, province: null, city: null }
    try {
      if (ip !== "unknown") {
        geo = await lookupIP(ip)
      }
    } catch {
      // IP 解析失败，静默忽略
    }
    await prisma.surveyView.create({
      data: {
        surveyId: survey.id,
        ip: ip,
        country: geo.country,
        province: geo.province,
        city: geo.city,
      },
    })
  }

  // 返回当前总浏览量
  const totalViews = await prisma.surveyView.count({
    where: { surveyId: survey.id },
  })

  return NextResponse.json({ totalViews })
}
