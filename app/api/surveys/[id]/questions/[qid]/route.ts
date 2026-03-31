import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/prisma"
import { z } from "zod"

const updateQuestionSchema = z.object({
  text: z.string().min(1).optional(),
  type: z
    .enum(["SINGLE_CHOICE", "MULTIPLE_CHOICE", "TEXT", "RATING"])
    .optional(),
  required: z.boolean().optional(),
  options: z.array(z.string()).optional(),
  order: z.number().int().optional(),
})

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; qid: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 })
  }

  const { id, qid } = await params
  const survey = await prisma.survey.findUnique({
    where: { id, userId: session.user.id },
  })
  if (!survey) {
    return NextResponse.json({ error: "问卷不存在" }, { status: 404 })
  }

  const body = await request.json()
  const parsed = updateQuestionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0].message },
      { status: 400 }
    )
  }

  const question = await prisma.question.update({
    where: { id: qid, surveyId: id },
    data: parsed.data,
  })

  return NextResponse.json(question)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; qid: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 })
  }

  const { id, qid } = await params
  const survey = await prisma.survey.findUnique({
    where: { id, userId: session.user.id },
  })
  if (!survey) {
    return NextResponse.json({ error: "问卷不存在" }, { status: 404 })
  }

  await prisma.question.delete({ where: { id: qid, surveyId: id } })
  return NextResponse.json({ message: "删除成功" })
}
