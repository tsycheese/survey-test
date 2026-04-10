import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/prisma"

// 修改协作者权限（仅创建者）
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id: surveyId, userId } = await params

  // 检查是否是创建者
  const survey = await prisma.survey.findUnique({
    where: { id: surveyId },
  })

  if (!survey) {
    return NextResponse.json({ error: "Survey not found" }, { status: 404 })
  }

  if (survey.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await req.json()
  const { canEdit, canViewResults } = body

  try {
    const updated = await prisma.surveyCollaborator.update({
      where: {
        surveyId_userId: {
          surveyId,
          userId,
        },
      },
      data: {
        canEdit: canEdit ?? undefined,
        canViewResults: canViewResults ?? undefined,
      },
    })

    return NextResponse.json(updated)
  } catch {
    return NextResponse.json(
      { error: "Collaborator not found" },
      { status: 404 }
    )
  }
}

// 移除协作者（仅创建者）
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id: surveyId, userId } = await params

  // 检查是否是创建者
  const survey = await prisma.survey.findUnique({
    where: { id: surveyId },
  })

  if (!survey) {
    return NextResponse.json({ error: "Survey not found" }, { status: 404 })
  }

  if (survey.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    await prisma.surveyCollaborator.delete({
      where: {
        surveyId_userId: {
          surveyId,
          userId,
        },
      },
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json(
      { error: "Collaborator not found" },
      { status: 404 }
    )
  }
}
