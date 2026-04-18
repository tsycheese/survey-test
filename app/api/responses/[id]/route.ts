import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/prisma"

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 })
  }

  const { id } = await params

  // 查找回答并验证权限（必须是该问卷的创建者）
  const response = await prisma.response.findUnique({
    where: { id },
    include: { survey: { select: { userId: true } } },
  })

  if (!response) {
    return NextResponse.json({ error: "回答不存在" }, { status: 404 })
  }

  if (response.survey.userId !== session.user.id) {
    return NextResponse.json({ error: "无权限删除" }, { status: 403 })
  }

  // 硬删除（级联删除关联的 Answer 记录）
  await prisma.response.delete({ where: { id } })

  return NextResponse.json({ message: "删除成功" })
}
