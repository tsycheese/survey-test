"use client"

import { useCallback, useEffect, useRef } from "react"
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
  unlockQuestion: (questionId: string, lockId: string) => Promise<boolean>
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
  const previousSelectedRef = useRef<string | null>(null)
  const lockQueueRef = useRef<Promise<void>>(Promise.resolve())
  const activeSurveyRef = useRef(surveyId)
  const lockedQuestionsRef = useRef(lockedQuestions)

  useEffect(() => {
    lockedQuestionsRef.current = lockedQuestions
  }, [lockedQuestions])

  useEffect(() => {
    activeSurveyRef.current = surveyId
    previousSelectedRef.current = null
    lockQueueRef.current = Promise.resolve()
  }, [surveyId])

  const selectWithLock = useCallback(
    (questionId: string) => {
      if (previousSelectedRef.current === questionId) {
        const currentLock = lockedQuestionsRef.current.get(questionId)
        if (
          currentLock?.userId === currentUserId &&
          currentLock.lockClientId === clientId
        ) {
          return
        }
        previousSelectedRef.current = null
      }

      const targetSurveyId = surveyId

      lockQueueRef.current = lockQueueRef.current
        .then(async () => {
          if (activeSurveyRef.current !== targetSurveyId) return
          const previousId = previousSelectedRef.current

          const lockInfo = lockedQuestionsRef.current.get(questionId)
          if (
            lockInfo &&
            (lockInfo.userId !== currentUserId ||
              lockInfo.lockClientId !== clientId)
          ) {
            toast.warning(
              lockInfo.userId === currentUserId
                ? "该题目已在您的另一个标签页中编辑"
                : `该题目正在被 ${lockInfo.userName || "其他用户"} 编辑`
            )
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
          const data = (await response.json().catch(() => ({}))) as {
            lock?: LockInfo
            error?: string
          }
          if (activeSurveyRef.current !== targetSurveyId) return

          if (response.status === 409) {
            if (data.lock) {
              const conflictLock = {
                ...data.lock,
                clientExpiresAt: performance.now() + data.lock.leaseRemainingMs,
              }
              setLockedQuestions((current) => {
                const next = new Map(current)
                next.set(questionId, conflictLock)
                return next
              })
            }
            toast.warning(
              data.lock?.userId === currentUserId
                ? "该题目已在您的另一个标签页中编辑"
                : `该题目正在被 ${data.lock?.userName || "其他用户"} 编辑`
            )
            return
          }

          if (!response.ok || !data.lock) {
            toast.error(data.error || "锁定题目失败，请刷新页面重试")
            return
          }

          const acquiredLock = {
            ...data.lock,
            clientExpiresAt: performance.now() + data.lock.leaseRemainingMs,
          }
          setLockedQuestions((current) =>
            new Map(current).set(questionId, acquiredLock)
          )
          previousSelectedRef.current = questionId
          onSelect(questionId)

          if (previousId && previousId !== questionId) {
            const previousLock = lockedQuestionsRef.current.get(previousId)
            if (
              previousLock?.userId === currentUserId &&
              previousLock.lockClientId === clientId
            ) {
              await unlockQuestion(previousId, previousLock.lockId).catch(
                () => false
              )
            }
          }
        })
        .catch(() => {
          if (activeSurveyRef.current === targetSurveyId) {
            toast.error("锁定题目失败，请检查网络后重试")
          }
        })
    },
    [
      clientId,
      currentUserId,
      onSelect,
      setLockedQuestions,
      surveyId,
      unlockQuestion,
    ]
  )

  const getLockInfo = useCallback(
    (questionId: string): LockInfo | undefined => {
      return lockedQuestions.get(questionId)
    },
    [lockedQuestions]
  )

  return { selectWithLock, getLockInfo }
}
