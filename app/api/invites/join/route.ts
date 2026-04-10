import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/prisma"

// 使用邀请码加入协作
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const { code } = body

  if (!code || typeof code !== "string") {
    return NextResponse.json({ error: "Invalid code" }, { status: 400 })
  }

  // 查找邀请码
  const invite = await prisma.surveyInvite.findUnique({
    where: { code: code.toUpperCase() },
    include: {
      survey: {
        include: {
          _count: {
            select: { collaborators: true },
          },
        },
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
  if (invite.survey._count.collaborators >= invite.survey.maxCollaborators) {
    return NextResponse.json(
      { error: "Collaborator limit reached" },
      { status: 400 }
    )
  }

  // 创建协作者关系
  const permissions = (invite.permissions as {
    canEdit?: boolean
    canViewResults?: boolean
  }) || { canEdit: false, canViewResults: false }

  const collaborator = await prisma.surveyCollaborator.create({
    data: {
      surveyId: invite.surveyId,
      userId: session.user.id,
      canEdit: permissions.canEdit ?? false,
      canViewResults: permissions.canViewResults ?? false,
      invitedBy: invite.createdBy,
    },
  })

  // 更新邀请码使用次数
  await prisma.surveyInvite.update({
    where: { id: invite.id },
    data: { usedCount: { increment: 1 } },
  })

  return NextResponse.json({
    survey: {
      id: invite.survey.id,
      title: invite.survey.title,
    },
    permissions: {
      canEdit: collaborator.canEdit,
      canViewResults: collaborator.canViewResults,
    },
  })
}
