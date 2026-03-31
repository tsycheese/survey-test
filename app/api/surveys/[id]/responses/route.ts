import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/prisma"

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
  })
  if (!survey) {
    return NextResponse.json({ error: "问卷不存在" }, { status: 404 })
  }

  const responses = await prisma.response.findMany({
    where: { surveyId: id },
    include: { answers: true },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(responses)
}
