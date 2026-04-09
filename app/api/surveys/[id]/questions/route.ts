import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/prisma"
import { z } from "zod"

const questionSchema = z.object({
  title: z.string().min(1, "题目不能为空"),
  description: z.string().optional(),
  type: z.enum([
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
  ]),
  required: z.boolean().default(false),
  config: z
    .record(z.unknown())
    .optional()
    .transform(
      (v) =>
        v as
          | import("@/prisma/generated/prisma/client").Prisma.InputJsonValue
          | undefined
    ),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 })
  }

  const { id } = await params
  const survey = await prisma.survey.findUnique({
    where: { id, userId: session.user.id },
  })
  if (!survey) {
    return NextResponse.json({ error: "问卷不存在" }, { status: 404 })
  }

  const body = await request.json()
  const parsed = questionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0].message },
      { status: 400 }
    )
  }

  const count = await prisma.question.count({ where: { surveyId: id } })

  const question = await prisma.question.create({
    data: {
      surveyId: id,
      title: parsed.data.title,
      description: parsed.data.description,
      type: parsed.data.type,
      required: parsed.data.required,
      config: parsed.data.config ?? {},
      order: count,
    },
  })

  return NextResponse.json(question, { status: 201 })
}
