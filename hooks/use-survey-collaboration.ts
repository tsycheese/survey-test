"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import Pusher from "pusher-js"
import {
  COLLABORATION_EVENTS,
  getSurveyChannel,
  type MemberInfo,
  type LockInfo,
} from "@/lib/realtime-shared"

// Pusher 客户端单例（仅在客户端创建）
let pusherClient: Pusher | null = null
let pusherClientCreatedAt: number | null = null

type RealtimeDiagnosticPayload = {
  requestId?: string
  timestamp?: string
}

function getRealtimePerformanceTime(): number {
  return performance.now()
}

function getPusherClient(): Pusher | null {
  if (typeof window === "undefined") {
    return null
  }

  if (!pusherClient) {
    const useLocalRealtime =
      process.env.NEXT_PUBLIC_REALTIME_PROVIDER === "soketi"
    const key = useLocalRealtime
      ? (process.env.NEXT_PUBLIC_SOKETI_APP_KEY ?? "survey-local-key")
      : process.env.NEXT_PUBLIC_PUSHER_KEY
    const cluster = useLocalRealtime
      ? "mt1"
      : process.env.NEXT_PUBLIC_PUSHER_CLUSTER

    if (!key || !cluster) {
      console.error("Pusher: Missing environment variables")
      return null
    }

    pusherClientCreatedAt = getRealtimePerformanceTime()
    pusherClient = new Pusher(key, {
      cluster,
      authEndpoint: "/api/pusher/auth",
      ...(useLocalRealtime
        ? {
            wsHost: process.env.NEXT_PUBLIC_SOKETI_HOST ?? "127.0.0.1",
            wsPort: Number(process.env.NEXT_PUBLIC_SOKETI_PORT ?? "6001"),
            forceTLS: false,
            enabledTransports: ["ws" as const],
            disableStats: true,
          }
        : {}),
    })

    console.info("[Realtime Provider]", {
      provider: useLocalRealtime ? "soketi" : "pusher",
    })

    pusherClient.connection.bind(
      "state_change",
      ({ previous, current }: { previous: string; current: string }) => {
        console.info("[Realtime Connection State]", {
          previous,
          current,
          durationSinceClientCreated: pusherClientCreatedAt
            ? `${(getRealtimePerformanceTime() - pusherClientCreatedAt).toFixed(
                1
              )}ms`
            : "unknown",
        })
      }
    )

    pusherClient.connection.bind("connected", () => {
      console.info("[Realtime Connection Performance]", {
        phase: "client-created-to-connected",
        duration: pusherClientCreatedAt
          ? `${(getRealtimePerformanceTime() - pusherClientCreatedAt).toFixed(
              1
            )}ms`
          : "unknown",
        transport: pusherClient?.connection.state,
      })
    })

    pusherClient.connection.bind("error", (error: unknown) => {
      console.error("[Realtime Connection Error]", error)
    })
  }
  return pusherClient
}

export type CollaborationState = {
  members: Map<string, MemberInfo>
  lockedQuestions: Map<string, LockInfo>
  isConnected: boolean
  currentUser: MemberInfo | null
}

export type CollaborationActions = {
  lockQuestion: (questionId: string) => Promise<boolean>
  unlockQuestion: (questionId: string) => Promise<boolean>
  unlockAllQuestions: (userId?: string) => Promise<boolean>
  onEvent: (event: string, callback: (data: unknown) => void) => () => void
  setLockedQuestions: React.Dispatch<
    React.SetStateAction<Map<string, LockInfo>>
  >
}

export function useSurveyCollaboration(
  surveyId: string | null,
  userId: string | null
): CollaborationState & CollaborationActions {
  const [members, setMembers] = useState<Map<string, MemberInfo>>(new Map())
  const [lockedQuestions, setLockedQuestions] = useState<Map<string, LockInfo>>(
    new Map()
  )
  const [isConnected, setIsConnected] = useState(false)
  const [currentUser, setCurrentUser] = useState<MemberInfo | null>(null)

  const channelRef = useRef<ReturnType<Pusher["subscribe"]> | null>(null)
  const subscribedRef = useRef(false)

  // 订阅 Presence Channel
  useEffect(() => {
    if (!surveyId || !userId) return

    const pusher = getPusherClient()
    if (!pusher) {
      console.error("Pusher client not available")
      return
    }

    const channelName = getSurveyChannel(surveyId)
    const subscriptionStartedAt = getRealtimePerformanceTime()
    const channel = pusher.subscribe(channelName)
    channelRef.current = channel

    const handleRealtimeDiagnosticEvent = (
      eventName: string,
      data: RealtimeDiagnosticPayload
    ) => {
      if (
        !(Object.values(COLLABORATION_EVENTS) as string[]).includes(eventName)
      )
        return

      const emittedAt = data?.timestamp ? Date.parse(data.timestamp) : NaN
      console.info("[Realtime Event Delivery Performance]", {
        eventName,
        requestId: data?.requestId ?? "unknown",
        emittedToReceived: Number.isFinite(emittedAt)
          ? `${(Date.now() - emittedAt).toFixed(1)}ms`
          : "unknown",
      })
    }

    channel.bind_global(handleRealtimeDiagnosticEvent)

    // Presence Channel: 订阅成功时获取成员列表
    channel.bind(
      "pusher:subscription_succeeded",
      (data: {
        members: Record<string, { name?: string; image?: string }>
        myID: string
        me: { id: string; info?: { name?: string; image?: string } }
      }) => {
        setIsConnected(true)

        console.info("[Realtime Subscription Performance]", {
          channel: channelName,
          duration: `${(
            getRealtimePerformanceTime() - subscriptionStartedAt
          ).toFixed(1)}ms`,
          memberCount: Object.keys(data.members).length,
        })

        // 构建成员列表（包含所有成员，包括自己）
        // 注意：data.members 的格式是 { [userId]: { name, image } }
        const membersMap = new Map<string, MemberInfo>()
        Object.entries(data.members).forEach(([userId, member]) => {
          membersMap.set(userId, {
            userId: userId,
            name: member.name ?? null,
            image: member.image ?? null,
            joinedAt: new Date().toISOString(),
          })
        })

        // 确保当前用户在列表中（有时候 Pusher 不会包含自己）
        if (data.me?.info && !membersMap.has(data.myID)) {
          membersMap.set(data.myID, {
            userId: data.myID,
            name: data.me.info.name ?? null,
            image: data.me.info.image ?? null,
            joinedAt: new Date().toISOString(),
          })
        }

        setMembers(membersMap)

        // 设置当前用户
        if (data.me?.info) {
          setCurrentUser({
            userId: data.myID,
            name: data.me.info.name ?? null,
            image: data.me.info.image ?? null,
            joinedAt: new Date().toISOString(),
          })
        }

        subscribedRef.current = true
      }
    )

    // Presence Channel: 新成员加入
    // 注意：member 的格式是 { id: userId, info: { name, image } }
    channel.bind(
      "pusher:member_added",
      (member: { id: string; info?: { name?: string; image?: string } }) => {
        if (!member.info) return
        setMembers((prev) => {
          const next = new Map(prev)
          next.set(member.id, {
            userId: member.id,
            name: member.info?.name ?? null,
            image: member.info?.image ?? null,
            joinedAt: new Date().toISOString(),
          })
          return next
        })
      }
    )

    // Presence Channel: 成员离开（关键！自动解锁）
    channel.bind("pusher:member_removed", (member: { id: string }) => {
      // 从成员列表移除
      setMembers((prev) => {
        const next = new Map(prev)
        next.delete(member.id)
        return next
      })

      // 自动解锁该用户锁定的所有题目
      setLockedQuestions((prev) => {
        const next = new Map(prev)
        for (const [qid, lock] of next.entries()) {
          if (lock.userId === member.id) {
            next.delete(qid)
          }
        }
        return next
      })

      // 调用 API 解锁数据库中的题目
      fetch("/api/surveys/collaboration/unlock-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ surveyId, userId: member.id }),
      }).catch(console.error)
    })

    // 订阅错误
    channel.bind("pusher:subscription_error", () => {
      setIsConnected(false)
    })

    // 监听协作事件
    channel.bind(COLLABORATION_EVENTS.QUESTION_LOCKED, (data: LockInfo) => {
      setLockedQuestions((prev) => new Map(prev).set(data.questionId, data))
    })

    channel.bind(
      COLLABORATION_EVENTS.QUESTION_UNLOCKED,
      (data: { questionId: string }) => {
        setLockedQuestions((prev) => {
          const next = new Map(prev)
          next.delete(data.questionId)
          return next
        })
      }
    )

    channel.bind(
      COLLABORATION_EVENTS.QUESTIONS_UNLOCK_ALL,
      (data: { userId: string }) => {
        setLockedQuestions((prev) => {
          const next = new Map(prev)
          for (const [qid, lock] of next.entries()) {
            if (lock.userId === data.userId) {
              next.delete(qid)
            }
          }
          return next
        })
      }
    )

    // 清理函数
    return () => {
      channel.unbind_global(handleRealtimeDiagnosticEvent)
      channel.unbind_all()
      pusher.unsubscribe(channelName)
      subscribedRef.current = false
      setIsConnected(false)
      setMembers(new Map())
      setLockedQuestions(new Map())
    }
  }, [surveyId, userId])

  // 锁定题目
  const lockQuestion = useCallback(
    async (questionId: string): Promise<boolean> => {
      if (!surveyId) return false

      try {
        const response = await fetch("/api/surveys/collaboration/lock", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ surveyId, questionId }),
        })

        return response.ok
      } catch (error) {
        console.error("Lock question error:", error)
        return false
      }
    },
    [surveyId]
  )

  // 解锁题目
  const unlockQuestion = useCallback(
    async (questionId: string): Promise<boolean> => {
      if (!surveyId) return false

      try {
        const response = await fetch("/api/surveys/collaboration/unlock", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ surveyId, questionId }),
        })

        return response.ok
      } catch (error) {
        console.error("Unlock question error:", error)
        return false
      }
    },
    [surveyId]
  )

  // 解锁所有题目
  const unlockAllQuestions = useCallback(
    async (targetUserId?: string): Promise<boolean> => {
      if (!surveyId) return false

      try {
        const response = await fetch("/api/surveys/collaboration/unlock-all", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ surveyId, userId: targetUserId }),
        })

        return response.ok
      } catch (error) {
        console.error("Unlock all questions error:", error)
        return false
      }
    },
    [surveyId]
  )

  // 注册事件监听器（用于内容同步）
  const onEvent = useCallback(
    (event: string, callback: (data: unknown) => void) => {
      if (!channelRef.current) {
        return () => {}
      }
      channelRef.current.bind(event, callback)
      return () => {
        channelRef.current?.unbind(event, callback)
      }
    },
    []
  )

  return {
    members,
    lockedQuestions,
    isConnected,
    currentUser,
    lockQuestion,
    unlockQuestion,
    unlockAllQuestions,
    onEvent,
    setLockedQuestions,
  }
}
