"use client"

import { useCallback, useEffect, useRef } from "react"
import { toast } from "sonner"
import {
  useEditorStore,
  type RemoteEditorEventOutcome,
} from "@/lib/editor-store"
import {
  toEditorQuestionFromSyncEvent,
  toEditorSurvey,
  toLockedQuestions,
  toRemoteQuestionDeletedPayload,
  toRemoteQuestionsCreatedPayload,
  toRemoteQuestionsReorderedPayload,
  toRemoteSurveyDetailsPayload,
  type SurveySnapshot,
} from "@/lib/editor-snapshots"
import {
  COLLABORATION_EVENTS,
  REALTIME_REQUEST_ID_HEADER,
  type LockInfo,
  type SyncEventData,
} from "@/lib/realtime-shared"
import { logPerformance } from "@/lib/performance-logging"

type UseSurveyReconciliationOptions = {
  surveyId: string
  canAccess: boolean
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
  clientId,
  subscriptionEpoch,
  onEvent,
  getRealtimeEventSequence,
  reconcileLockedQuestions,
}: UseSurveyReconciliationOptions) {
  const reconcileSurvey = useEditorStore((state) => state.reconcileSurvey)
  const applyRemoteQuestionUpdate = useEditorStore(
    (state) => state.applyRemoteQuestionUpdate
  )
  const applyRemoteQuestionsCreated = useEditorStore(
    (state) => state.applyRemoteQuestionsCreated
  )
  const applyRemoteQuestionDeleted = useEditorStore(
    (state) => state.applyRemoteQuestionDeleted
  )
  const applyRemoteQuestionsReordered = useEditorStore(
    (state) => state.applyRemoteQuestionsReordered
  )
  const applyRemoteSurveyDetails = useEditorStore(
    (state) => state.applyRemoteSurveyDetails
  )
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
      const requestId = crypto.randomUUID()

      try {
        const response = await fetch(`/api/surveys/${surveyId}`, {
          signal: controller.signal,
          headers: { [REALTIME_REQUEST_ID_HEADER]: requestId },
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
          toLockedQuestions(snapshot),
          snapshotStartedEventSequence
        )
        logPerformance("[Realtime Snapshot Reconciliation]", {
          reason,
          requestId,
          duration: `${(performance.now() - startedAt).toFixed(1)}ms`,
          serverTiming: response.headers.get("server-timing") ?? "unavailable",
          vercelId: response.headers.get("x-vercel-id") ?? "local",
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

    const isOwnEvent = (event: SyncEventData | undefined) =>
      Boolean(event?.clientId && event.clientId === clientId)

    const fallbackForInvalidPayload = (
      eventName: string,
      event: SyncEventData | undefined,
      startedAt: number,
      message: string
    ) => {
      logPerformance("[Realtime Incremental Reconciliation]", {
        eventName,
        requestId: event?.requestId ?? "unknown",
        result: "snapshot-fallback",
        reason: "invalid-event-payload",
        duration: `${(performance.now() - startedAt).toFixed(1)}ms`,
      })
      scheduleReconciliation(`${eventName}-invalid-payload`)
      toast.info(message, { duration: 2000 })
    }

    const finishIncrementalReconciliation = (
      eventName: string,
      event: SyncEventData | undefined,
      outcome: RemoteEditorEventOutcome,
      startedAt: number,
      message: string,
      details: Record<string, unknown> = {}
    ) => {
      logPerformance("[Realtime Incremental Reconciliation]", {
        eventName,
        requestId: event?.requestId ?? "unknown",
        ...details,
        result:
          outcome.status === "fallback" ? "snapshot-fallback" : outcome.status,
        reason: outcome.reason,
        knownRevision: outcome.knownRevision,
        incomingRevision: outcome.incomingRevision,
        duration: `${(performance.now() - startedAt).toFixed(1)}ms`,
      })

      if (outcome.status === "fallback") {
        scheduleReconciliation(`${eventName}-${outcome.reason}`)
      }
      if (outcome.status !== "ignored") {
        toast.info(message, { duration: 2000 })
      }
    }

    const unsubscribers = [
      onEvent(COLLABORATION_EVENTS.QUESTION_UPDATED, (data) => {
        const event = data as SyncEventData | undefined
        if (isOwnEvent(event)) return

        const startedAt = performance.now()
        const question = toEditorQuestionFromSyncEvent(data)
        if (!question) {
          fallbackForInvalidPayload(
            COLLABORATION_EVENTS.QUESTION_UPDATED,
            event,
            startedAt,
            "题目已被其他协作者更新"
          )
          return
        }

        finishIncrementalReconciliation(
          COLLABORATION_EVENTS.QUESTION_UPDATED,
          event,
          applyRemoteQuestionUpdate(surveyId, question),
          startedAt,
          "题目已被其他协作者更新",
          { questionId: question.id }
        )
      }),
      onEvent(COLLABORATION_EVENTS.QUESTION_CREATED, (data) => {
        const event = data as SyncEventData | undefined
        if (isOwnEvent(event)) return

        const startedAt = performance.now()
        const payload = toRemoteQuestionsCreatedPayload(data)
        if (!payload) {
          fallbackForInvalidPayload(
            COLLABORATION_EVENTS.QUESTION_CREATED,
            event,
            startedAt,
            "有新题目添加"
          )
          return
        }

        finishIncrementalReconciliation(
          COLLABORATION_EVENTS.QUESTION_CREATED,
          event,
          applyRemoteQuestionsCreated(
            surveyId,
            payload.questions,
            payload.structureRevision
          ),
          startedAt,
          "有新题目添加",
          { questionCount: payload.questions.length }
        )
      }),
      onEvent(COLLABORATION_EVENTS.QUESTION_DELETED, (data) => {
        const event = data as SyncEventData | undefined
        if (isOwnEvent(event)) return

        const startedAt = performance.now()
        const payload = toRemoteQuestionDeletedPayload(data)
        if (!payload) {
          fallbackForInvalidPayload(
            COLLABORATION_EVENTS.QUESTION_DELETED,
            event,
            startedAt,
            "有题目被删除"
          )
          return
        }

        finishIncrementalReconciliation(
          COLLABORATION_EVENTS.QUESTION_DELETED,
          event,
          applyRemoteQuestionDeleted(
            surveyId,
            payload.questionId,
            payload.structureRevision
          ),
          startedAt,
          "有题目被删除",
          { questionId: payload.questionId }
        )
      }),
      onEvent(COLLABORATION_EVENTS.QUESTIONS_REORDERED, (data) => {
        const event = data as SyncEventData | undefined
        if (isOwnEvent(event)) return

        const startedAt = performance.now()
        const payload = toRemoteQuestionsReorderedPayload(data)
        if (!payload) {
          fallbackForInvalidPayload(
            COLLABORATION_EVENTS.QUESTIONS_REORDERED,
            event,
            startedAt,
            "题目顺序已更新"
          )
          return
        }

        finishIncrementalReconciliation(
          COLLABORATION_EVENTS.QUESTIONS_REORDERED,
          event,
          applyRemoteQuestionsReordered(
            surveyId,
            payload.questions,
            payload.structureRevision
          ),
          startedAt,
          "题目顺序已更新",
          { questionCount: payload.questions.length }
        )
      }),
      onEvent(COLLABORATION_EVENTS.SURVEY_UPDATED, (data) => {
        const event = data as SyncEventData | undefined
        if (isOwnEvent(event)) return

        const startedAt = performance.now()
        const details = toRemoteSurveyDetailsPayload(data)
        if (!details) {
          fallbackForInvalidPayload(
            COLLABORATION_EVENTS.SURVEY_UPDATED,
            event,
            startedAt,
            "问卷信息已更新"
          )
          return
        }

        finishIncrementalReconciliation(
          COLLABORATION_EVENTS.SURVEY_UPDATED,
          event,
          applyRemoteSurveyDetails(surveyId, details),
          startedAt,
          "问卷信息已更新"
        )
      }),
    ]

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe())
    }
  }, [
    applyRemoteQuestionDeleted,
    applyRemoteQuestionUpdate,
    applyRemoteQuestionsCreated,
    applyRemoteQuestionsReordered,
    applyRemoteSurveyDetails,
    canAccess,
    clientId,
    onEvent,
    scheduleReconciliation,
    surveyId,
  ])

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
