import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/prisma"
import { lookupIP } from "@/lib/geoip"
import { z } from "zod"

const submitSchema = z.object({
  answers: z.record(
    z.string(),
    z.union([
      z.string(),
      z.array(z.string()),
      z.number(),
      z.null(),
      z.record(z.string(), z.string()), // MATRIX_SINGLE
    ])
  ),
  metadata: z
    .object({
      startedAt: z.string().datetime().nullable().optional(),
      deviceType: z.string().nullable().optional(),
      os: z.string().nullable().optional(),
      browser: z.string().nullable().optional(),
      source: z.string().nullable().optional(),
      referrer: z.string().nullable().optional(),
    })
    .optional(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const survey = await prisma.survey.findUnique({
    where: { shareToken: token, published: true },
    include: { questions: true },
  })

  // 获取当前版本ID
  const currentVersionId = survey?.currentVersionId

  if (!survey) {
    return NextResponse.json({ error: "问卷不存在或未发布" }, { status: 404 })
  }

  const body = await request.json()
  const parsed = submitSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0].message },
      { status: 400 }
    )
  }

  // 检查必填题
  const requiredIds = survey.questions
    .filter((q: { required: boolean }) => q.required)
    .map((q: { id: string }) => q.id)
  const answeredIds = Object.keys(parsed.data.answers).filter(
    (id) => parsed.data.answers[id] !== null && parsed.data.answers[id] !== ""
  )
  const missing = requiredIds.filter((id: string) => !answeredIds.includes(id))
  if (missing.length > 0) {
    return NextResponse.json({ error: "请回答所有必填题" }, { status: 400 })
  }

  const meta = parsed.data.metadata
  const ip = request.headers.get("x-forwarded-for") || null

  // 解析 IP 地域信息（失败不阻塞提交）
  let geo: {
    country: string | null
    province: string | null
    city: string | null
  } = { country: null, province: null, city: null }
  try {
    if (ip) {
      geo = await lookupIP(ip)
    }
  } catch {
    // IP 解析失败，静默忽略
  }

  const response = await prisma.response.create({
    data: {
      surveyId: survey.id,
      versionId: currentVersionId || "",
      startedAt: meta?.startedAt ? new Date(meta.startedAt) : null,
      completedAt: new Date(),
      deviceType: meta?.deviceType || null,
      os: meta?.os || null,
      browser: meta?.browser || null,
      source: meta?.source || null,
      referrer: meta?.referrer || null,
      ip: ip,
      country: geo.country,
      province: geo.province,
      city: geo.city,
      answers: {
        create: Object.entries(parsed.data.answers)
          .filter(([, value]) => value !== null)
          .map(([questionId, value]) => ({
            questionId,
            value: value as string | number | string[],
          })) as { questionId: string; value: string | number | string[] }[],
      },
    },
  })

  return NextResponse.json(
    { message: "提交成功", responseId: response.id },
    { status: 201 }
  )
}
