import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/prisma"

// 获取协作者列表
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
        include: {
          user: {
            select: { id: true, name: true, email: true, image: true },
          },
        },
      },
    },
  })

  if (!survey) {
    return NextResponse.json({ error: "Survey not found" }, { status: 404 })
  }

  const isOwner = survey.userId === session.user!.id
  const isCollaborator = survey.collaborators.some(
    (c) => c.userId === session.user!.id
  )

  if (!isOwner && !isCollaborator) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  return NextResponse.json(survey.collaborators)
}
