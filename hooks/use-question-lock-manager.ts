"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { Dispatch, SetStateAction } from "react"
import { toast } from "sonner"
import { getEditorMutationHeaders } from "@/lib/editor-mutations"
import type { LockInfo } from "@/lib/realtime-shared"

type SetLockedQuestions = Dispatch<SetStateAction<Map<string, LockInfo>>>

type UseQuestionLockManagerOptions = {
  surveyId: string
  currentUserId: string | null
  clientId: string | null
  lockedQuestions: Map<string, LockInfo>
  unlockQuestion: (questionId: string) => Promise<boolean>
  setLockedQuestions: SetLockedQuestions
  onSelect: (questionId: string) => void
}

export function useQuestionLockManager({
  surveyId,
  currentUserId,
  clientId,
  lockedQuestions,
  unlockQuestion,
  setLockedQuestions,
  onSelect,
}: UseQuestionLockManagerOptions) {
  const [optimisticLockedId, setOptimisticLockedId] = useState<string | null>(
    null
  )
  const previousSelectedRef = useRef<string | null>(null)
  const lockQueueRef = useRef<Promise<void>>(Promise.resolve())
  const activeSurveyRef = useRef(surveyId)

  useEffect(() => {
    activeSurveyRef.current = surveyId
    previousSelectedRef.current = null
    lockQueueRef.current = Promise.resolve()
    setOptimisticLockedId(null)
  }, [surveyId])

  const selectWithLock = useCallback(
    (questionId: string) => {
      if (previousSelectedRef.current === questionId) return

      onSelect(questionId)
      setOptimisticLockedId(questionId)

      const targetSurveyId = surveyId
      const previousId = previousSelectedRef.current
      previousSelectedRef.current = questionId

      lockQueueRef.current = lockQueueRef.current
        .then(async () => {
          if (previousId) {
            await unlockQuestion(previousId).catch(() => false)
          }
          if (activeSurveyRef.current !== targetSurveyId) return

          const lockInfo = lockedQuestions.get(questionId)
          if (lockInfo && lockInfo.userId !== currentUserId) {
            setOptimisticLockedId((current) =>
              current === questionId ? null : current
            )
            if (previousSelectedRef.current === questionId) {
              previousSelectedRef.current = null
            }
            return
          }

          const response = await fetch("/api/surveys/collaboration/lock", {
            method: "POST",
            headers: getEditorMutationHeaders(clientId),
            body: JSON.stringify({
              surveyId: targetSurveyId,
              questionId,
            }),
          })
          if (response.ok || activeSurveyRef.current !== targetSurveyId) return

          setOptimisticLockedId((current) =>
            current === questionId ? null : current
          )
          if (previousSelectedRef.current === questionId) {
            previousSelectedRef.current = null
          }

          if (response.status === 409) {
            const data = (await response.json().catch(() => ({}))) as {
              lockedByUserId?: string
              lockedBy?: string
              lockedAt?: string
            }
            if (data.lockedByUserId) {
              setLockedQuestions((current) => {
                const next = new Map(current)
                next.set(questionId, {
                  questionId,
                  userId: data.lockedByUserId!,
                  userName: data.lockedBy || "其他用户",
                  lockedAt: data.lockedAt || new Date().toISOString(),
                })
                return next
              })
            }
            toast.warning(`该题目正在被 ${data.lockedBy || "其他用户"} 编辑`)
            return
          }

          toast.error("锁定题目失败，请刷新页面重试")
        })
        .catch(() => {
          if (activeSurveyRef.current !== targetSurveyId) return
          setOptimisticLockedId((current) =>
            current === questionId ? null : current
          )
          if (previousSelectedRef.current === questionId) {
            previousSelectedRef.current = null
          }
        })
    },
    [
      clientId,
      currentUserId,
      lockedQuestions,
      onSelect,
      setLockedQuestions,
      surveyId,
      unlockQuestion,
    ]
  )

  const getLockInfo = useCallback(
    (questionId: string): LockInfo | undefined => {
      const serverLock = lockedQuestions.get(questionId)
      if (serverLock) return serverLock
      if (optimisticLockedId !== questionId || !currentUserId) return undefined

      return {
        questionId,
        userId: currentUserId,
        userName: "我",
        lockedAt: new Date().toISOString(),
      }
    },
    [currentUserId, lockedQuestions, optimisticLockedId]
  )

  return { selectWithLock, getLockInfo }
}
