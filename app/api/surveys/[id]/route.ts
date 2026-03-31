import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/prisma"
import { z } from "zod"

const updateSurveySchema = z.object({
  title: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
})

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 })
  }

  const { id } = await params
  const survey = await prisma.survey.findUnique({
    where: { id, userId: session.user.id },
    include: {
      questions: { orderBy: { order: "asc" } },
      _count: { select: { responses: true } },
    },
  })

  if (!survey) {
    return NextResponse.json({ error: "问卷不存在" }, { status: 404 })
  }

  return NextResponse.json(survey)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json()
  const parsed = updateSurveySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0].message },
      { status: 400 }
    )
  }

  const existing = await prisma.survey.findUnique({
    where: { id, userId: session.user.id },
  })
  if (!existing) {
    return NextResponse.json({ error: "问卷不存在" }, { status: 404 })
  }

  const survey = await prisma.survey.update({
    where: { id },
    data: parsed.data,
  })

  return NextResponse.json(survey)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 })
  }

  const { id } = await params
  const existing = await prisma.survey.findUnique({
    where: { id, userId: session.user.id },
  })
  if (!existing) {
    return NextResponse.json({ error: "问卷不存在" }, { status: 404 })
  }

  await prisma.survey.delete({ where: { id } })
  return NextResponse.json({ message: "删除成功" })
}
