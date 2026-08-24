"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import Pusher from "pusher-js"
import {
  COLLABORATION_EVENTS,
  REALTIME_CLIENT_ID_HEADER,
  getSurveyChannel,
  type MemberInfo,
  type LockInfo,
} from "@/lib/realtime-shared"

// Pusher 客户端单例（仅在客户端创建）
let pusherClient: Pusher | null = null
let pusherClientCreatedAt: number | null = null
let realtimeClientId: string | null = null

type RealtimeDiagnosticPayload = {
  requestId?: string
  clientId?: string
  timestamp?: string
}

type RealtimeEventCallback = (data: unknown) => void

function getRealtimeClientId(): string | null {
  if (typeof window === "undefined") return null
  realtimeClientId ??= crypto.randomUUID()
  return realtimeClientId
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
  clientId: string | null
  subscriptionEpoch: number
}

export type CollaborationActions = {
  lockQuestion: (questionId: string) => Promise<boolean>
  unlockQuestion: (questionId: string) => Promise<boolean>
  unlockAllQuestions: (userId?: string) => Promise<boolean>
  reconcileLockedQuestions: (
    snapshot: Map<string, LockInfo>,
    snapshotStartedAt: number
  ) => void
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
  const [subscriptionEpoch, setSubscriptionEpoch] = useState(0)

  const clientId = getRealtimeClientId()
  const eventListenersRef = useRef<Map<string, Set<RealtimeEventCallback>>>(
    new Map()
  )
  const seenEventIdsRef = useRef<Map<string, number>>(new Map())
  const lockEventTimestampsRef = useRef<Map<string, number>>(new Map())
  const userUnlockTimestampsRef = useRef<Map<string, number>>(new Map())

  // 订阅 Presence Channel
  useEffect(() => {
    if (!surveyId || !userId) return

    const seenEventIds = seenEventIdsRef.current
    const lockEventTimestamps = lockEventTimestampsRef.current
    const userUnlockTimestamps = userUnlockTimestampsRef.current

    const pusher = getPusherClient()
    if (!pusher) {
      console.error("Pusher client not available")
      return
    }

    const channelName = getSurveyChannel(surveyId)
    const subscriptionStartedAt = getRealtimePerformanceTime()
    const channel = pusher.subscribe(channelName)

    const handleConnectionStateChange = ({
      current,
    }: {
      previous: string
      current: string
    }) => {
      if (current !== "connected") {
        setIsConnected(false)
      }
    }

    pusher.connection.bind("state_change", handleConnectionStateChange)

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

      const isOwnClientEvent = Boolean(
        data?.clientId && data.clientId === clientId
      )

      if (data?.requestId) {
        const now = Date.now()
        if (seenEventIdsRef.current.has(data.requestId)) return
        seenEventIdsRef.current.set(data.requestId, now)

        if (seenEventIdsRef.current.size > 500) {
          for (const [requestId, seenAt] of seenEventIdsRef.current) {
            if (now - seenAt > 5 * 60 * 1000) {
              seenEventIdsRef.current.delete(requestId)
            }
          }
          while (seenEventIdsRef.current.size > 500) {
            const oldestRequestId = seenEventIdsRef.current.keys().next().value
            if (!oldestRequestId) break
            seenEventIdsRef.current.delete(oldestRequestId)
          }
        }
      }

      const eventData = data as RealtimeDiagnosticPayload & {
        questionId?: string
        userId?: string
        userName?: string | null
        lockedAt?: string
        unlockedAt?: string
      }
      const eventTimestamp = Date.parse(
        eventData.lockedAt ?? eventData.unlockedAt ?? eventData.timestamp ?? ""
      )
      const comparableTimestamp = Number.isFinite(eventTimestamp)
        ? eventTimestamp
        : Date.now()

      if (
        !isOwnClientEvent &&
        eventName === COLLABORATION_EVENTS.QUESTION_LOCKED &&
        eventData.questionId &&
        eventData.userId &&
        eventData.lockedAt
      ) {
        const lastQuestionEvent =
          lockEventTimestampsRef.current.get(eventData.questionId) ?? 0
        const lastUserUnlock =
          userUnlockTimestampsRef.current.get(eventData.userId) ?? 0

        if (
          comparableTimestamp > lastQuestionEvent &&
          comparableTimestamp > lastUserUnlock
        ) {
          lockEventTimestampsRef.current.set(
            eventData.questionId,
            comparableTimestamp
          )
          setLockedQuestions((prev) =>
            new Map(prev).set(eventData.questionId!, {
              questionId: eventData.questionId!,
              userId: eventData.userId!,
              userName: eventData.userName ?? null,
              lockedAt: eventData.lockedAt!,
            })
          )
        }
      }

      if (
        !isOwnClientEvent &&
        eventName === COLLABORATION_EVENTS.QUESTION_UNLOCKED &&
        eventData.questionId
      ) {
        const lastQuestionEvent =
          lockEventTimestampsRef.current.get(eventData.questionId) ?? 0
        if (comparableTimestamp > lastQuestionEvent) {
          lockEventTimestampsRef.current.set(
            eventData.questionId,
            comparableTimestamp
          )
          setLockedQuestions((prev) => {
            const next = new Map(prev)
            next.delete(eventData.questionId!)
            return next
          })
        }
      }

      if (
        !isOwnClientEvent &&
        eventName === COLLABORATION_EVENTS.QUESTIONS_UNLOCK_ALL &&
        eventData.userId
      ) {
        const lastUserUnlock =
          userUnlockTimestampsRef.current.get(eventData.userId) ?? 0
        if (comparableTimestamp > lastUserUnlock) {
          userUnlockTimestampsRef.current.set(
            eventData.userId,
            comparableTimestamp
          )
          setLockedQuestions((prev) => {
            const next = new Map(prev)
            for (const [questionId, lock] of next.entries()) {
              if (lock.userId === eventData.userId) {
                next.delete(questionId)
                lockEventTimestampsRef.current.set(
                  questionId,
                  comparableTimestamp
                )
              }
            }
            return next
          })
        }
      }

      eventListenersRef.current
        .get(eventName)
        ?.forEach((callback) => callback(data))
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
        setSubscriptionEpoch((epoch) => epoch + 1)

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
        headers: {
          "Content-Type": "application/json",
          ...(clientId ? { [REALTIME_CLIENT_ID_HEADER]: clientId } : {}),
        },
        body: JSON.stringify({ surveyId, userId: member.id }),
      }).catch(console.error)
    })

    // 订阅错误
    channel.bind("pusher:subscription_error", () => {
      setIsConnected(false)
    })

    // 清理函数
    return () => {
      pusher.connection.unbind("state_change", handleConnectionStateChange)
      channel.unbind_global(handleRealtimeDiagnosticEvent)
      channel.unbind_all()
      pusher.unsubscribe(channelName)
      setIsConnected(false)
      setMembers(new Map())
      setLockedQuestions(new Map())
      setCurrentUser(null)
      setSubscriptionEpoch(0)
      seenEventIds.clear()
      lockEventTimestamps.clear()
      userUnlockTimestamps.clear()
    }
  }, [clientId, surveyId, userId])

  // 锁定题目
  const lockQuestion = useCallback(
    async (questionId: string): Promise<boolean> => {
      if (!surveyId) return false

      try {
        const response = await fetch("/api/surveys/collaboration/lock", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(clientId ? { [REALTIME_CLIENT_ID_HEADER]: clientId } : {}),
          },
          body: JSON.stringify({ surveyId, questionId }),
        })

        return response.ok
      } catch (error) {
        console.error("Lock question error:", error)
        return false
      }
    },
    [clientId, surveyId]
  )

  // 解锁题目
  const unlockQuestion = useCallback(
    async (questionId: string): Promise<boolean> => {
      if (!surveyId) return false

      try {
        const response = await fetch("/api/surveys/collaboration/unlock", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(clientId ? { [REALTIME_CLIENT_ID_HEADER]: clientId } : {}),
          },
          body: JSON.stringify({ surveyId, questionId }),
        })

        return response.ok
      } catch (error) {
        console.error("Unlock question error:", error)
        return false
      }
    },
    [clientId, surveyId]
  )

  // 解锁所有题目
  const unlockAllQuestions = useCallback(
    async (targetUserId?: string): Promise<boolean> => {
      if (!surveyId) return false

      try {
        const response = await fetch("/api/surveys/collaboration/unlock-all", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(clientId ? { [REALTIME_CLIENT_ID_HEADER]: clientId } : {}),
          },
          body: JSON.stringify({ surveyId, userId: targetUserId }),
        })

        return response.ok
      } catch (error) {
        console.error("Unlock all questions error:", error)
        return false
      }
    },
    [clientId, surveyId]
  )

  const reconcileLockedQuestions = useCallback(
    (snapshot: Map<string, LockInfo>, snapshotStartedAt: number) => {
      setLockedQuestions((current) => {
        const next = new Map(snapshot)
        const questionIds = new Set([
          ...current.keys(),
          ...snapshot.keys(),
          ...lockEventTimestampsRef.current.keys(),
        ])

        for (const questionId of questionIds) {
          const lastEventAt =
            lockEventTimestampsRef.current.get(questionId) ?? 0

          if (lastEventAt > snapshotStartedAt) {
            const currentLock = current.get(questionId)
            if (currentLock) {
              next.set(questionId, currentLock)
            } else {
              next.delete(questionId)
            }
            continue
          }

          lockEventTimestampsRef.current.set(questionId, snapshotStartedAt)
        }

        return next
      })
    },
    []
  )

  // 注册事件监听器（用于内容同步）
  const onEvent = useCallback(
    (event: string, callback: (data: unknown) => void) => {
      const listeners = eventListenersRef.current.get(event) ?? new Set()
      listeners.add(callback)
      eventListenersRef.current.set(event, listeners)

      return () => {
        const currentListeners = eventListenersRef.current.get(event)
        currentListeners?.delete(callback)
        if (currentListeners?.size === 0) {
          eventListenersRef.current.delete(event)
        }
      }
    },
    []
  )

  return {
    members,
    lockedQuestions,
    isConnected,
    currentUser,
    clientId,
    subscriptionEpoch,
    lockQuestion,
    unlockQuestion,
    unlockAllQuestions,
    reconcileLockedQuestions,
    onEvent,
    setLockedQuestions,
  }
}
