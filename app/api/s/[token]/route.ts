import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/prisma"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const { searchParams } = new URL(request.url)
  const isPreview = searchParams.get("preview") === "1"

  // 预览模式：需要登录且是问卷所有者
  if (isPreview) {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未登录" }, { status: 401 })
    }

    // 预览模式使用 survey id 作为 token
    const survey = await prisma.survey.findUnique({
      where: { id: token, userId: session.user.id },
      include: { questions: { orderBy: { order: "asc" } } },
    })

    if (!survey) {
      return NextResponse.json({ error: "问卷不存在" }, { status: 404 })
    }

    return NextResponse.json(survey)
  }

  // 正常模式：只返回已发布的问卷
  const survey = await prisma.survey.findUnique({
    where: { shareToken: token, published: true },
    include: { questions: { orderBy: { order: "asc" } } },
  })

  if (!survey) {
    return NextResponse.json({ error: "问卷不存在或未发布" }, { status: 404 })
  }

  return NextResponse.json(survey)
}
