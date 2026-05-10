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

  // 预览模式：需要登录且是问卷所有者或协作者
  if (isPreview) {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未登录" }, { status: 401 })
    }

    const userId = session.user.id

    // 预览模式使用 survey id 作为 token
    // 先尝试查找问卷（不限定 userId，可能是协作者）
    const survey = await prisma.survey.findUnique({
      where: { id: token },
      include: {
        questions: { orderBy: { order: "asc" } },
        collaborators: {
          where: { userId },
          select: { id: true },
        },
      },
    })

    if (!survey) {
      return NextResponse.json({ error: "问卷不存在" }, { status: 404 })
    }

    // 检查是否是创建者或协作者
    const isOwner = survey.userId === userId
    const isCollaborator = survey.collaborators.length > 0

    if (!isOwner && !isCollaborator) {
      return NextResponse.json({ error: "无权限预览" }, { status: 403 })
    }

    return NextResponse.json(survey)
  }

  // 正常模式：读取当前发布版本的快照
  const survey = await prisma.survey.findUnique({
    where: { shareToken: token, published: true },
    select: {
      id: true,
      settings: true,
      currentVersionId: true,
    },
  })

  if (!survey || !survey.currentVersionId) {
    return NextResponse.json({ error: "问卷不存在或未发布" }, { status: 404 })
  }

  // 读取版本快照
  const version = await prisma.surveyVersion.findUnique({
    where: { id: survey.currentVersionId },
  })

  if (!version) {
    return NextResponse.json({ error: "版本不存在" }, { status: 404 })
  }

  // 只返回答题需要的数据
  return NextResponse.json({
    id: survey.id,
    title: version.title,
    description: version.description,
    published: true,
    settings: survey.settings ?? { showQuestionNumber: true },
    questions: version.questions,
  })
}
