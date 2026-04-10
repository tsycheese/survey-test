import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/prisma"

// 获取操作日志
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id: surveyId } = await params

  // 检查是否是创建者或协作者
  const survey = await prisma.survey.findUnique({
    where: { id: surveyId },
    include: {
      collaborators: {
        where: { userId: session.user.id },
      },
    },
  })

  if (!survey) {
    return NextResponse.json({ error: "Survey not found" }, { status: 404 })
  }

  const isOwner = survey.userId === session.user.id
  const isCollaborator = survey.collaborators.length > 0

  if (!isOwner && !isCollaborator) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const logs = await prisma.surveyLog.findMany({
    where: { surveyId },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  })

  return NextResponse.json(logs)
}
