"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import Pusher from "pusher-js"
import {
  COLLABORATION_EVENTS,
  getSurveyChannel,
  type MemberInfo,
  type LockInfo,
} from "@/lib/pusher"

// Pusher 客户端单例（仅在客户端创建）
let pusherClient: Pusher | null = null

function getPusherClient(): Pusher | null {
  if (typeof window === "undefined") {
    return null
  }

  if (!pusherClient) {
    const key = process.env.NEXT_PUBLIC_PUSHER_KEY
    const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER

    if (!key || !cluster) {
      console.error("Pusher: Missing environment variables")
      return null
    }

    pusherClient = new Pusher(key, {
      cluster: cluster,
      authEndpoint: "/api/pusher/auth",
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
    const channel = pusher.subscribe(channelName)
    channelRef.current = channel

    // Presence Channel: 订阅成功时获取成员列表
    channel.bind(
      "pusher:subscription_succeeded",
      (members: {
        members: Record<
          string,
          { id: string; info?: { name?: string; image?: string } }
        >
      }) => {
        setIsConnected(true)

        // 构建成员列表
        const membersMap = new Map<string, MemberInfo>()
        Object.values(members.members).forEach((member) => {
          if (member.info) {
            membersMap.set(member.id, {
              userId: member.id,
              name: member.info.name ?? null,
              image: member.info.image ?? null,
              joinedAt: new Date().toISOString(),
            })
          }
        })
        setMembers(membersMap)

        // 设置当前用户
        const me = members.members[userId]
        if (me?.info) {
          setCurrentUser({
            userId: me.id,
            name: me.info.name ?? null,
            image: me.info.image ?? null,
            joinedAt: new Date().toISOString(),
          })
        }

        subscribedRef.current = true
      }
    )

    // Presence Channel: 新成员加入
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
      if (subscribedRef.current) {
        channel.unbind_all()
        pusher.unsubscribe(channelName)
        subscribedRef.current = false
        setIsConnected(false)
        setMembers(new Map())
        setLockedQuestions(new Map())
      }
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
  }
}
