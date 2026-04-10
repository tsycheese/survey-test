import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/prisma"

// 验证邀请码有效性（不加入）
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const { surveyId, code } = body

  if (!surveyId || typeof surveyId !== "string") {
    return NextResponse.json({ error: "Invalid surveyId" }, { status: 400 })
  }

  if (!code || typeof code !== "string") {
    return NextResponse.json({ error: "Invalid code" }, { status: 400 })
  }

  // 查找邀请码（同时验证 surveyId 和 code）
  const invite = await prisma.surveyInvite.findFirst({
    where: {
      surveyId,
      code: code.toUpperCase(),
    },
    include: {
      survey: {
        select: { id: true, title: true, userId: true },
      },
    },
  })

  if (!invite) {
    return NextResponse.json({ error: "Invalid invite code" }, { status: 404 })
  }

  // 检查是否过期
  if (invite.expiresAt && new Date() > invite.expiresAt) {
    return NextResponse.json({ error: "Invite expired" }, { status: 400 })
  }

  // 检查使用次数
  if (invite.maxUses && invite.usedCount >= invite.maxUses) {
    return NextResponse.json({ error: "Invite limit reached" }, { status: 400 })
  }

  // 检查是否已是协作者
  const existing = await prisma.surveyCollaborator.findUnique({
    where: {
      surveyId_userId: {
        surveyId: invite.surveyId,
        userId: session.user.id,
      },
    },
  })

  if (existing) {
    return NextResponse.json(
      { error: "Already a collaborator" },
      { status: 400 }
    )
  }

  // 检查是否是创建者
  if (invite.survey.userId === session.user.id) {
    return NextResponse.json(
      { error: "You are the owner of this survey" },
      { status: 400 }
    )
  }

  // 检查协作者数量是否已达上限
  const survey = await prisma.survey.findUnique({
    where: { id: invite.surveyId },
    include: {
      _count: {
        select: { collaborators: true },
      },
    },
  })

  if (survey && survey._count.collaborators >= survey.maxCollaborators) {
    return NextResponse.json(
      { error: "Collaborator limit reached" },
      { status: 400 }
    )
  }

  const permissions = (invite.permissions as {
    canEdit?: boolean
    canViewResults?: boolean
  }) || { canEdit: false, canViewResults: false }

  return NextResponse.json({
    survey: {
      id: invite.survey.id,
      title: invite.survey.title,
    },
    permissions: {
      canEdit: permissions.canEdit ?? false,
      canViewResults: permissions.canViewResults ?? false,
    },
  })
}
