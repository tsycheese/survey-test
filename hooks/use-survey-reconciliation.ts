"use client"

import { useCallback, useEffect, useRef } from "react"
import { toast } from "sonner"
import { useEditorStore } from "@/lib/editor-store"
import {
  toEditorSurvey,
  toLockedQuestions,
  type SurveySnapshot,
} from "@/lib/editor-snapshots"
import {
  COLLABORATION_EVENTS,
  type LockInfo,
  type SyncEventData,
} from "@/lib/realtime-shared"
import { logPerformance } from "@/lib/performance-logging"

type UseSurveyReconciliationOptions = {
  surveyId: string
  canAccess: boolean
  currentUserId: string | null
  clientId: string | null
  subscriptionEpoch: number
  onEvent: (event: string, callback: (data: unknown) => void) => () => void
  getRealtimeEventSequence: () => number
  reconcileLockedQuestions: (
    snapshot: Map<string, LockInfo>,
    snapshotStartedEventSequence: number
  ) => void
}

export function useSurveyReconciliation({
  surveyId,
  canAccess,
  currentUserId,
  clientId,
  subscriptionEpoch,
  onEvent,
  getRealtimeEventSequence,
  reconcileLockedQuestions,
}: UseSurveyReconciliationOptions) {
  const reconcileSurvey = useEditorStore((state) => state.reconcileSurvey)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const controllerRef = useRef<AbortController | null>(null)
  const sequenceRef = useRef(0)

  const reconcileFromServer = useCallback(
    async (reason: string) => {
      if (!canAccess) return

      controllerRef.current?.abort()
      const controller = new AbortController()
      controllerRef.current = controller
      const sequence = ++sequenceRef.current
      const snapshotStartedEventSequence = getRealtimeEventSequence()
      const startedAt = performance.now()

      try {
        const response = await fetch(`/api/surveys/${surveyId}`, {
          signal: controller.signal,
        })
        if (!response.ok) return

        const snapshot = (await response.json()) as SurveySnapshot
        if (
          controller.signal.aborted ||
          sequence !== sequenceRef.current ||
          useEditorStore.getState().survey?.id !== surveyId
        ) {
          return
        }

        reconcileSurvey(toEditorSurvey(snapshot))
        reconcileLockedQuestions(
          toLockedQuestions(snapshot, currentUserId),
          snapshotStartedEventSequence
        )
        logPerformance("[Realtime Snapshot Reconciliation]", {
          reason,
          duration: `${(performance.now() - startedAt).toFixed(1)}ms`,
          questionCount: snapshot.questions?.length ?? 0,
        })
      } catch (error) {
        if (controller.signal.aborted) return
        console.error("[Realtime Snapshot Reconciliation Error]", {
          reason,
          error,
        })
      }
    },
    [
      canAccess,
      currentUserId,
      getRealtimeEventSequence,
      reconcileLockedQuestions,
      reconcileSurvey,
      surveyId,
    ]
  )

  const scheduleReconciliation = useCallback(
    (reason: string, delay = 40) => {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        timerRef.current = null
        void reconcileFromServer(reason)
      }, delay)
    },
    [reconcileFromServer]
  )

  useEffect(() => {
    if (!canAccess) return

    const subscriptions = [
      [COLLABORATION_EVENTS.QUESTION_UPDATED, "题目已被其他协作者更新"],
      [COLLABORATION_EVENTS.QUESTION_CREATED, "有新题目添加"],
      [COLLABORATION_EVENTS.QUESTION_DELETED, "有题目被删除"],
      [COLLABORATION_EVENTS.QUESTIONS_REORDERED, null],
      [COLLABORATION_EVENTS.SURVEY_UPDATED, "问卷信息已更新"],
    ] as const

    const unsubscribers = subscriptions.map(([event, message]) =>
      onEvent(event, (data) => {
        scheduleReconciliation(event)
        const eventClientId = (data as SyncEventData | undefined)?.clientId
        if (message && eventClientId !== clientId) {
          toast.info(message, { duration: 2000 })
        }
      })
    )

    return () => unsubscribers.forEach((unsubscribe) => unsubscribe())
  }, [canAccess, clientId, onEvent, scheduleReconciliation])

  useEffect(() => {
    if (subscriptionEpoch === 0) return
    scheduleReconciliation("subscription-succeeded", 0)
  }, [scheduleReconciliation, subscriptionEpoch])

  useEffect(() => {
    const handleOnline = () => scheduleReconciliation("browser-online", 0)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        scheduleReconciliation("page-visible", 0)
      }
    }

    window.addEventListener("online", handleOnline)
    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => {
      window.removeEventListener("online", handleOnline)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [scheduleReconciliation])

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      controllerRef.current?.abort()
    },
    [surveyId]
  )

  return { reconcileFromServer, scheduleReconciliation }
}
