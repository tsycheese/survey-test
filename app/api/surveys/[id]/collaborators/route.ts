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

  // 获取问卷、拥有者和协作者列表
  const survey = await prisma.survey.findUnique({
    where: { id: surveyId },
    include: {
      user: {
        select: { id: true, name: true, email: true, image: true },
      },
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

  return NextResponse.json({
    owner: survey.user,
    collaborators: survey.collaborators,
  })
}
