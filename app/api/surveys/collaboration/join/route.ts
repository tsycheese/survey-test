import { auth } from "@/lib/auth"
import { prisma } from "@/prisma"
import { NextResponse } from "next/server"

/**
 * POST /api/surveys/collaboration/join
 * 用户加入问卷协作（仅用于权限检查和日志记录）
 * Presence Channel 自动处理成员加入事件
 */
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未登录" }, { status: 401 })
    }

    const { surveyId } = await request.json()

    if (!surveyId) {
      return NextResponse.json({ error: "缺少问卷ID" }, { status: 400 })
    }

    // 验证用户是否有权限
    const survey = await prisma.survey.findUnique({
      where: { id: surveyId },
      include: {
        collaborators: {
          where: { userId: session.user.id },
        },
      },
    })

    if (!survey) {
      return NextResponse.json({ error: "问卷不存在" }, { status: 404 })
    }

    const isOwner = survey.userId === session.user.id
    const isCollaborator = survey.collaborators.length > 0

    if (!isOwner && !isCollaborator) {
      return NextResponse.json({ error: "没有权限" }, { status: 403 })
    }

    // 记录日志（可选，Presence Channel 已处理成员管理）
    await prisma.surveyLog.create({
      data: {
        surveyId,
        userId: session.user.id,
        action: "JOIN_COLLABORATION",
        details: {},
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Join collaboration error:", error)
    return NextResponse.json({ error: "加入协作失败" }, { status: 500 })
  }
}
