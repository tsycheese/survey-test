import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/prisma"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const survey = await prisma.survey.findUnique({
    where: { shareToken: token, published: true },
    include: { questions: { orderBy: { order: "asc" } } },
  })

  if (!survey) {
    return NextResponse.json({ error: "问卷不存在或未发布" }, { status: 404 })
  }

  return NextResponse.json(survey)
}
