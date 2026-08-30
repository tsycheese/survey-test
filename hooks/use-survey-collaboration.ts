"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import Pusher from "pusher-js"
import {
  COLLABORATION_EVENTS,
  getSurveyChannel,
  type MemberInfo,
  type LockInfo,
} from "@/lib/realtime-shared"
import {
  finishRealtimeRequest,
  getRealtimeRequestHeaders,
} from "@/lib/realtime-performance"
import { logPerformance } from "@/lib/performance-logging"

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

type LockPayload = {
  questionId?: string
  userId?: string
  userName?: string | null
  lockedAt?: string
  lockClientId?: string
  lockId?: string
  lockExpiresAt?: string
  leaseRemainingMs?: number
}

function toClientLock(data: LockPayload): LockInfo | null {
  if (
    !data.questionId ||
    !data.userId ||
    !data.lockedAt ||
    !data.lockClientId ||
    !data.lockId ||
    !data.lockExpiresAt ||
    typeof data.leaseRemainingMs !== "number" ||
    data.leaseRemainingMs <= 0
  ) {
    return null
  }

  return {
    questionId: data.questionId,
    userId: data.userId,
    userName: data.userName ?? null,
    lockedAt: data.lockedAt,
    lockClientId: data.lockClientId,
    lockId: data.lockId,
    lockExpiresAt: data.lockExpiresAt,
    leaseRemainingMs: data.leaseRemainingMs,
    clientExpiresAt: performance.now() + data.leaseRemainingMs,
  }
}

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

    logPerformance("[Realtime Provider]", {
      provider: useLocalRealtime ? "soketi" : "pusher",
    })

    pusherClient.connection.bind(
      "state_change",
      ({ previous, current }: { previous: string; current: string }) => {
        logPerformance("[Realtime Connection State]", {
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
      logPerformance("[Realtime Connection Performance]", {
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
  unlockQuestion: (questionId: string, lockId: string) => Promise<boolean>
  reconcileLockedQuestions: (
    snapshot: Map<string, LockInfo>,
    snapshotStartedEventSequence: number
  ) => void
  getRealtimeEventSequence: () => number
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
  const realtimeEventSequenceRef = useRef(0)
  const lockEventSequencesRef = useRef<Map<string, number>>(new Map())
  const userUnlockSequencesRef = useRef<Map<string, number>>(new Map())
  const releasedLockIdsRef = useRef<Set<string>>(new Set())
  const lockedQuestionsRef = useRef<Map<string, LockInfo>>(new Map())

  useEffect(() => {
    lockedQuestionsRef.current = lockedQuestions
  }, [lockedQuestions])

  // 订阅 Presence Channel
  useEffect(() => {
    if (!surveyId || !userId) return

    const seenEventIds = seenEventIdsRef.current
    const lockEventSequences = lockEventSequencesRef.current
    const userUnlockSequences = userUnlockSequencesRef.current
    const releasedLockIds = releasedLockIdsRef.current

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

      const receivedAt = getRealtimePerformanceTime()
      const eventSequence = ++realtimeEventSequenceRef.current
      const requestToReceived = data?.requestId
        ? finishRealtimeRequest(data.requestId, receivedAt)
        : null
      logPerformance("[Realtime Event Delivery Performance]", {
        eventName,
        requestId: data?.requestId ?? "unknown",
        requestToReceived:
          requestToReceived === null
            ? "not-measured-remote-origin"
            : `${requestToReceived.toFixed(1)}ms`,
        measurement:
          requestToReceived === null
            ? "cross-client-event"
            : "same-client-round-trip",
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

      const eventData = data as RealtimeDiagnosticPayload &
        LockPayload & {
          unlockedAt?: string
          leases?: Array<{ questionId?: string; lockId?: string }>
        }
      if (
        !isOwnClientEvent &&
        (eventName === COLLABORATION_EVENTS.QUESTION_LOCKED ||
          eventName === COLLABORATION_EVENTS.QUESTION_LOCK_RENEWED)
      ) {
        const incomingLock = toClientLock(eventData)
        if (!incomingLock) return
        if (releasedLockIdsRef.current.has(incomingLock.lockId)) return
        const lastQuestionEvent =
          lockEventSequencesRef.current.get(incomingLock.questionId) ?? 0
        const lastUserUnlock =
          userUnlockSequencesRef.current.get(incomingLock.userId) ?? 0

        if (
          eventSequence > lastQuestionEvent &&
          eventSequence > lastUserUnlock
        ) {
          lockEventSequencesRef.current.set(
            incomingLock.questionId,
            eventSequence
          )
          setLockedQuestions((prev) => {
            const current = prev.get(incomingLock.questionId)
            if (
              eventName === COLLABORATION_EVENTS.QUESTION_LOCK_RENEWED &&
              current?.lockId !== incomingLock.lockId
            ) {
              return prev
            }
            return new Map(prev).set(incomingLock.questionId, incomingLock)
          })
        }
      }

      if (
        !isOwnClientEvent &&
        eventName === COLLABORATION_EVENTS.QUESTION_UNLOCKED &&
        eventData.questionId &&
        eventData.lockId
      ) {
        const lastQuestionEvent =
          lockEventSequencesRef.current.get(eventData.questionId) ?? 0
        if (eventSequence > lastQuestionEvent) {
          lockEventSequencesRef.current.set(eventData.questionId, eventSequence)
          releasedLockIdsRef.current.add(eventData.lockId)
          setLockedQuestions((prev) => {
            const next = new Map(prev)
            if (next.get(eventData.questionId!)?.lockId === eventData.lockId) {
              next.delete(eventData.questionId!)
            }
            return next
          })
        }
      }

      if (
        !isOwnClientEvent &&
        eventName === COLLABORATION_EVENTS.QUESTIONS_UNLOCK_ALL &&
        eventData.userId &&
        Array.isArray(eventData.leases)
      ) {
        const lastUserUnlock =
          userUnlockSequencesRef.current.get(eventData.userId) ?? 0
        if (eventSequence > lastUserUnlock) {
          userUnlockSequencesRef.current.set(eventData.userId, eventSequence)
          setLockedQuestions((prev) => {
            const next = new Map(prev)
            for (const lease of eventData.leases ?? []) {
              if (!lease.questionId || !lease.lockId) continue
              releasedLockIdsRef.current.add(lease.lockId)
              const lock = next.get(lease.questionId)
              if (
                lock &&
                lock.userId === eventData.userId &&
                lock.lockId === lease.lockId
              ) {
                next.delete(lease.questionId)
                lockEventSequencesRef.current.set(
                  lease.questionId,
                  eventSequence
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

        logPerformance("[Realtime Subscription Performance]", {
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

    // Presence 只维护在线成员。数据库锁由租约保证最终失效，客户端观察者不再代为清理。
    channel.bind("pusher:member_removed", (member: { id: string }) => {
      setMembers((prev) => {
        const next = new Map(prev)
        next.delete(member.id)
        return next
      })
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
      lockEventSequences.clear()
      userUnlockSequences.clear()
      releasedLockIds.clear()
      realtimeEventSequenceRef.current = 0
    }
  }, [clientId, surveyId, userId])

  // 解锁题目
  const unlockQuestion = useCallback(
    async (questionId: string, lockId: string): Promise<boolean> => {
      if (!surveyId) return false

      try {
        const response = await fetch("/api/surveys/collaboration/unlock", {
          method: "POST",
          headers: getRealtimeRequestHeaders(clientId),
          body: JSON.stringify({ surveyId, questionId, lockId }),
        })

        if (response.ok) {
          releasedLockIdsRef.current.add(lockId)
          setLockedQuestions((current) => {
            if (current.get(questionId)?.lockId !== lockId) return current
            const next = new Map(current)
            next.delete(questionId)
            return next
          })
        }
        return response.ok
      } catch (error) {
        console.error("Unlock question error:", error)
        return false
      }
    },
    [clientId, surveyId]
  )

  const renewQuestion = useCallback(
    async (lock: LockInfo): Promise<boolean> => {
      if (!surveyId || !clientId) return false

      try {
        const response = await fetch("/api/surveys/collaboration/renew", {
          method: "POST",
          headers: getRealtimeRequestHeaders(clientId),
          body: JSON.stringify({
            surveyId,
            questionId: lock.questionId,
            lockId: lock.lockId,
          }),
        })

        if (response.ok) {
          const data = (await response.json()) as { lock?: LockPayload }
          const renewed = data.lock ? toClientLock(data.lock) : null
          if (!renewed) return false
          setLockedQuestions((current) => {
            if (current.get(lock.questionId)?.lockId !== lock.lockId) {
              return current
            }
            return new Map(current).set(lock.questionId, renewed)
          })
          return true
        }

        if (response.status === 409) {
          setLockedQuestions((current) => {
            if (current.get(lock.questionId)?.lockId !== lock.lockId) {
              return current
            }
            const next = new Map(current)
            next.delete(lock.questionId)
            return next
          })
        }
        return false
      } catch (error) {
        console.error("Renew question lock error:", error)
        return false
      }
    },
    [clientId, surveyId]
  )

  // 浏览器计时仅用于及时更新 UI；服务端仍会在每次读写时重新判断租约。
  useEffect(() => {
    if (lockedQuestions.size === 0) return
    const now = performance.now()
    const nearestExpiry = Math.min(
      ...[...lockedQuestions.values()].map(
        (lock) => lock.clientExpiresAt ?? now
      )
    )
    const timer = window.setTimeout(
      () => {
        const expiredAt = performance.now()
        setLockedQuestions((current) => {
          const next = new Map(current)
          for (const [questionId, lock] of next) {
            if ((lock.clientExpiresAt ?? 0) <= expiredAt) {
              next.delete(questionId)
            }
          }
          return next.size === current.size ? current : next
        })
      },
      Math.max(0, nearestExpiry - now)
    )
    return () => window.clearTimeout(timer)
  }, [lockedQuestions])

  useEffect(() => {
    if (!clientId || !userId) return
    const ownedLocks = [...lockedQuestions.values()].filter(
      (lock) => lock.userId === userId && lock.lockClientId === clientId
    )
    if (ownedLocks.length === 0) return

    const renewOwnedLocks = () => {
      if (document.visibilityState !== "visible") return
      void Promise.all(ownedLocks.map((lock) => renewQuestion(lock)))
    }
    const now = performance.now()
    const nextExpiry = Math.min(
      ...ownedLocks.map((lock) => lock.clientExpiresAt ?? now)
    )
    const timer = window.setTimeout(
      renewOwnedLocks,
      Math.max(1_000, Math.floor((nextExpiry - now) / 3))
    )
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") renewOwnedLocks()
    }
    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [clientId, lockedQuestions, renewQuestion, userId])

  useEffect(() => {
    if (!surveyId || !clientId || !userId) return
    const sentLeaseIds = new Set<string>()

    const leave = () => {
      const leases = [...lockedQuestionsRef.current.values()]
        .filter(
          (lock) => lock.userId === userId && lock.lockClientId === clientId
        )
        .map((lock) => ({
          questionId: lock.questionId,
          lockId: lock.lockId,
        }))
        .filter((lease) => !sentLeaseIds.has(lease.lockId))
      if (leases.length === 0) return
      leases.forEach((lease) => sentLeaseIds.add(lease.lockId))

      void fetch("/api/surveys/collaboration/leave", {
        method: "POST",
        headers: getRealtimeRequestHeaders(clientId),
        body: JSON.stringify({ surveyId, leases }),
        keepalive: true,
      }).catch(() => undefined)
    }

    window.addEventListener("pagehide", leave)
    return () => {
      window.removeEventListener("pagehide", leave)
      leave()
    }
  }, [clientId, surveyId, userId])

  const reconcileLockedQuestions = useCallback(
    (snapshot: Map<string, LockInfo>, snapshotStartedEventSequence: number) => {
      setLockedQuestions((current) => {
        const next = new Map(snapshot)
        const questionIds = new Set([
          ...current.keys(),
          ...snapshot.keys(),
          ...lockEventSequencesRef.current.keys(),
        ])

        for (const questionId of questionIds) {
          const lastEventSequence =
            lockEventSequencesRef.current.get(questionId) ?? 0

          if (lastEventSequence > snapshotStartedEventSequence) {
            const currentLock = current.get(questionId)
            if (currentLock) {
              next.set(questionId, currentLock)
            } else {
              next.delete(questionId)
            }
            continue
          }

          lockEventSequencesRef.current.set(
            questionId,
            snapshotStartedEventSequence
          )
        }

        return next
      })
    },
    []
  )

  const getRealtimeEventSequence = useCallback(
    () => realtimeEventSequenceRef.current,
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
    unlockQuestion,
    reconcileLockedQuestions,
    getRealtimeEventSequence,
    onEvent,
    setLockedQuestions,
  }
}
