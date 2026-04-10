import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/prisma"

// 删除邀请码（仅创建者）
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; inviteId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id: surveyId, inviteId } = await params

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
    await prisma.surveyInvite.delete({
      where: { id: inviteId },
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 })
  }
}
