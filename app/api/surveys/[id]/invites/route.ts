import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/prisma"
import { nanoid } from "nanoid"

// 获取邀请码列表
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id: surveyId } = await params

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

  const invites = await prisma.surveyInvite.findMany({
    where: { surveyId },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(invites)
}

// 创建邀请码
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id: surveyId } = await params

  // 检查是否是创建者
  const survey = await prisma.survey.findUnique({
    where: { id: surveyId },
    include: {
      _count: {
        select: { collaborators: true },
      },
    },
  })

  if (!survey) {
    return NextResponse.json({ error: "Survey not found" }, { status: 404 })
  }

  if (survey.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  // 检查协作者数量是否已达上限
  if (survey._count.collaborators >= survey.maxCollaborators) {
    return NextResponse.json(
      { error: "Collaborator limit reached" },
      { status: 400 }
    )
  }

  const body = await req.json()
  const { expiresIn, permissions } = body

  // 计算过期时间
  let expiresAt: Date | null = null
  if (expiresIn) {
    const days = parseInt(expiresIn)
    if (!isNaN(days)) {
      expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + days)
    }
  }

  // 生成6位邀请码（排除易混淆字符）
  const code = nanoid(6)
    .toUpperCase()
    .replace(/[0O]/g, "1")
    .replace(/[IL]/g, "J")

  const invite = await prisma.surveyInvite.create({
    data: {
      surveyId,
      code,
      expiresAt,
      permissions: permissions || { canEdit: false, canViewResults: false },
      createdBy: session.user.id,
    },
  })

  return NextResponse.json(invite)
}
