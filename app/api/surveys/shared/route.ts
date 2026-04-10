import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/prisma"

// 获取我参与的问卷（作为协作者）
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userId = session.user.id

  // 查找我作为协作者的所有问卷
  const collaborations = await prisma.surveyCollaborator.findMany({
    where: { userId },
    include: {
      survey: {
        include: {
          user: {
            select: { name: true, email: true },
          },
          _count: {
            select: { questions: true, responses: true },
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  })

  const result = collaborations.map((collab) => ({
    id: collab.survey.id,
    title: collab.survey.title,
    description: collab.survey.description,
    published: collab.survey.published,
    canEdit: collab.canEdit,
    canViewResults: collab.canViewResults,
    owner: collab.survey.user,
    _count: collab.survey._count,
  }))

  return NextResponse.json(result)
}
