import { auth } from "@/lib/auth"
import { pusherServer } from "@/lib/pusher"
import { prisma } from "@/prisma"
import { NextResponse } from "next/server"

/**
 * Pusher Presence 频道认证端点
 * 验证用户是否有权限访问该问卷频道
 */
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未登录" }, { status: 401 })
    }

    const formData = await request.formData()
    const socketId = formData.get("socket_id") as string
    const channel = formData.get("channel_name") as string

    if (!socketId || !channel) {
      return NextResponse.json({ error: "缺少必要参数" }, { status: 400 })
    }

    // 解析频道名称，格式: presence-survey-{surveyId}
    const match = channel.match(/^presence-survey-(.+)$/)
    if (!match) {
      return NextResponse.json({ error: "无效的频道名称" }, { status: 400 })
    }

    const surveyId = match[1]

    // 验证用户是否有权限访问该问卷
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

    // 检查是否是所有者或协作者
    const isOwner = survey.userId === session.user.id
    const isCollaborator = survey.collaborators.length > 0

    if (!isOwner && !isCollaborator) {
      return NextResponse.json({ error: "没有权限访问该问卷" }, { status: 403 })
    }

    // 生成 Presence Channel 认证签名
    // channel_data 包含用户信息，Pusher 会维护在线成员列表
    const channelData = {
      user_id: session.user.id,
      user_info: {
        name: session.user.name,
        image: session.user.image,
      },
    }

    const authResponse = pusherServer.authorizeChannel(
      socketId,
      channel,
      channelData
    )

    return NextResponse.json(authResponse)
  } catch (error) {
    console.error("Pusher auth error:", error)
    return NextResponse.json({ error: "认证失败" }, { status: 500 })
  }
}
