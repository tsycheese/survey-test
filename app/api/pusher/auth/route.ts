import { auth } from "@/lib/auth"
import { logPerformance } from "@/lib/performance-logging"
import { pusherServer, realtimeProvider } from "@/lib/pusher"
import { prisma } from "@/prisma"
import { NextResponse } from "next/server"

type PerformanceTimings = Record<string, number>

async function measure<T>(
  timings: PerformanceTimings,
  name: string,
  action: () => Promise<T>
): Promise<T> {
  const startedAt = performance.now()

  try {
    return await action()
  } finally {
    timings[name] = performance.now() - startedAt
  }
}

function formatServerTiming(timings: PerformanceTimings): string {
  return Object.entries(timings)
    .map(([name, duration]) => `${name};dur=${duration.toFixed(1)}`)
    .join(", ")
}

/**
 * Pusher Presence 频道认证端点
 * 验证用户是否有权限访问该问卷频道
 */
export async function POST(request: Request) {
  const requestId = crypto.randomUUID()
  const requestStartedAt = performance.now()
  const timings: PerformanceTimings = {}

  try {
    const session = await measure(timings, "auth", () => auth())
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未登录" }, { status: 401 })
    }
    const userId = session.user.id

    const formData = await measure(timings, "body", () => request.formData())
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
    const survey = await measure(timings, "permission", () =>
      prisma.survey.findUnique({
        where: { id: surveyId },
        include: {
          collaborators: {
            where: { userId },
          },
        },
      })
    )

    if (!survey) {
      return NextResponse.json({ error: "问卷不存在" }, { status: 404 })
    }

    // 检查是否是所有者或协作者
    const isOwner = survey.userId === userId
    const isCollaborator = survey.collaborators.length > 0

    if (!isOwner && !isCollaborator) {
      return NextResponse.json({ error: "没有权限访问该问卷" }, { status: 403 })
    }

    // 生成 Presence Channel 认证签名
    // channel_data 包含用户信息，Pusher 会维护在线成员列表
    const channelData = {
      user_id: userId,
      user_info: {
        name: session.user.name,
        image: session.user.image,
      },
    }

    const authResponse = await measure(timings, "authorize", async () =>
      pusherServer.authorizeChannel(socketId, channel, channelData)
    )

    timings.total = performance.now() - requestStartedAt

    logPerformance("[Realtime Auth Performance]", {
      requestId,
      provider: realtimeProvider,
      ...Object.fromEntries(
        Object.entries(timings).map(([name, duration]) => [
          name,
          `${duration.toFixed(1)}ms`,
        ])
      ),
    })

    return NextResponse.json(authResponse, {
      headers: {
        "Server-Timing": formatServerTiming(timings),
        "X-Request-Id": requestId,
      },
    })
  } catch (error) {
    console.error("Realtime auth error:", error)
    return NextResponse.json({ error: "认证失败" }, { status: 500 })
  }
}
