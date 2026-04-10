"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import Pusher from "pusher-js"
import {
  COLLABORATION_EVENTS,
  getSurveyChannel,
  type MemberInfo,
  type LockInfo,
} from "@/lib/pusher"

// Pusher 客户端单例
let pusherClient: Pusher | null = null

function getPusherClient(): Pusher {
  if (!pusherClient) {
    pusherClient = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
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
  joinSurvey: () => Promise<void>
  leaveSurvey: () => Promise<void>
  lockQuestion: (questionId: string) => Promise<boolean>
  unlockQuestion: (questionId: string) => Promise<boolean>
  unlockAllQuestions: (userId?: string) => Promise<boolean>
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
  const joinedRef = useRef(false)

  // 加入问卷协作
  const joinSurvey = useCallback(async () => {
    if (!surveyId || !userId || joinedRef.current) return

    try {
      // 调用 API 通知服务器
      const response = await fetch("/api/surveys/collaboration/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ surveyId }),
      })

      if (!response.ok) {
        throw new Error("加入协作失败")
      }

      // 订阅 Pusher 频道
      const pusher = getPusherClient()
      const channelName = getSurveyChannel(surveyId)
      const channel = pusher.subscribe(channelName)
      channelRef.current = channel

      // 绑定事件
      channel.bind(COLLABORATION_EVENTS.MEMBER_JOINED, (data: MemberInfo) => {
        setMembers((prev) => new Map(prev).set(data.userId, data))
      })

      channel.bind(
        COLLABORATION_EVENTS.MEMBER_LEFT,
        (data: { userId: string }) => {
          setMembers((prev) => {
            const next = new Map(prev)
            next.delete(data.userId)
            return next
          })
        }
      )

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
            // 删除该用户锁定的所有题目
            for (const [qid, lock] of next.entries()) {
              if (lock.userId === data.userId) {
                next.delete(qid)
              }
            }
            return next
          })
        }
      )

      // 监听连接状态
      channel.bind("pusher:subscription_succeeded", () => {
        setIsConnected(true)
      })

      channel.bind("pusher:subscription_error", () => {
        setIsConnected(false)
      })

      joinedRef.current = true
    } catch (error) {
      console.error("Join survey error:", error)
    }
  }, [surveyId, userId])

  // 离开问卷协作
  const leaveSurvey = useCallback(async () => {
    if (!surveyId || !joinedRef.current) return

    try {
      // 调用 API 通知服务器
      await fetch("/api/surveys/collaboration/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ surveyId }),
      })

      // 取消订阅
      if (channelRef.current) {
        channelRef.current.unbind_all()
        const pusher = getPusherClient()
        pusher.unsubscribe(getSurveyChannel(surveyId))
        channelRef.current = null
      }

      setIsConnected(false)
      setMembers(new Map())
      setLockedQuestions(new Map())
      joinedRef.current = false
    } catch (error) {
      console.error("Leave survey error:", error)
    }
  }, [surveyId])

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

  // 页面卸载时自动离开
  useEffect(() => {
    return () => {
      if (joinedRef.current && surveyId) {
        leaveSurvey()
      }
    }
  }, [surveyId, leaveSurvey])

  return {
    members,
    lockedQuestions,
    isConnected,
    currentUser,
    joinSurvey,
    leaveSurvey,
    lockQuestion,
    unlockQuestion,
    unlockAllQuestions,
  }
}
