import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/prisma"
import { z } from "zod"

const updateQuestionSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  type: z
    .enum([
      "SINGLE_CHOICE",
      "MULTIPLE_CHOICE",
      "TEXT",
      "RATING",
      "DROPDOWN",
      "TEXTAREA",
      "NUMBER",
      "NPS",
      "CES",
      "PHONE",
      "EMAIL",
      "DATETIME",
      "RANKING",
      "GENDER",
      "NAME",
      "BIRTHDAY",
      "MATRIX_SINGLE",
      "IMAGE_SINGLE_CHOICE",
      "IMAGE_MULTIPLE_CHOICE",
    ])
    .optional(),
  required: z.boolean().optional(),
  config: z
    .record(z.unknown())
    .optional()
    .transform(
      (v) =>
        v as
          | import("@/prisma/generated/prisma/client").Prisma.InputJsonValue
          | undefined
    ),
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
