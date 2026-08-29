"use client"

import { toast } from "sonner"
import {
  editorMutationKey,
  getEditorMutationHeaders,
  MutationRequestError,
  type KeyedMutationCoordinator,
} from "@/lib/editor-mutations"
import {
  toEditorQuestion,
  type PersistedQuestionResponse,
  type SurveyQuestionSnapshot,
} from "@/lib/editor-snapshots"
import { useEditorStore } from "@/lib/editor-store"
import type { Question } from "@/lib/questions/types"
import type { LockInfo } from "@/lib/realtime-shared"
import { logPerformance } from "@/lib/performance-logging"

type UseQuestionMutationOptions = {
  surveyId: string
  clientId: string | null
  currentUserId: string | null
  lockedQuestions: Map<string, LockInfo>
  coordinator: KeyedMutationCoordinator
}

export function useQuestionMutation({
  surveyId,
  clientId,
  currentUserId,
  lockedQuestions,
  coordinator,
}: UseQuestionMutationOptions) {
  function update(updated: Question, forceConflictRetry = false) {
    const lockInfo = lockedQuestions.get(updated.id)
    if (lockInfo && lockInfo.userId !== currentUserId) {
      toast.error(`该题目正在被 ${lockInfo.userName || "其他用户"} 编辑`)
      return
    }

    const store = useEditorStore.getState()
    store.updateQuestion(updated)
    const key = editorMutationKey.question(updated.id)
    if (
      store.mutationStates[key]?.status === "conflict" &&
      !forceConflictRetry
    ) {
      return
    }
    coordinator.unblock(key)
    store.setMutationState(key, "pending")

    void coordinator.enqueue(key, async () => {
      useEditorStore.getState().setMutationState(key, "pending")
      const baseline =
        useEditorStore.getState().questionBaselines[updated.id] ?? updated
      const requestId = crypto.randomUUID()
      const startedAt = performance.now()

      try {
        const response = await fetch(
          `/api/surveys/${surveyId}/questions/${updated.id}`,
          {
            method: "PUT",
            headers: getEditorMutationHeaders(clientId, requestId),
            body: JSON.stringify({
              expectedRevision: baseline.revision ?? 0,
              title: updated.title,
              description: updated.description,
              required: updated.required,
              config: updated.config,
            }),
          }
        )
        logPerformance("[Question Update Request Performance]", {
          requestId,
          status: response.status,
          duration: `${(performance.now() - startedAt).toFixed(1)}ms`,
          serverTiming: response.headers.get("server-timing") ?? "unavailable",
          vercelId: response.headers.get("x-vercel-id") ?? "local",
        })
        const data = (await response.json().catch(() => ({}))) as
          | PersistedQuestionResponse
          | {
              error?: string
              code?: string
              current?: SurveyQuestionSnapshot
            }

        if (!response.ok) {
          const errorData = data as {
            error?: string
            code?: string
            current?: SurveyQuestionSnapshot
          }
          if (errorData.current) {
            useEditorStore
              .getState()
              .setQuestionBaseline(toEditorQuestion(errorData.current))
          }

          throw new MutationRequestError(
            errorData.error || "保存失败",
            response.status,
            errorData.code
          )
        }

        const persisted = toEditorQuestion(data as PersistedQuestionResponse)
        useEditorStore.getState().commitQuestionMutation(updated, persisted)
        useEditorStore.getState().setMutationState(key, "saved")
      } catch (error) {
        coordinator.block(key)
        const isConflict =
          error instanceof MutationRequestError && error.status === 409
        const message =
          error instanceof Error ? error.message : "保存失败，请稍后重试"
        useEditorStore
          .getState()
          .setMutationState(key, isConflict ? "conflict" : "failed", message)
        toast.error(message)
      }
    })
  }

  function retry(questionId: string) {
    const question = useEditorStore
      .getState()
      .survey?.questions.find((item) => item.id === questionId)
    if (question) update(question, true)
  }

  function useServerVersion(questionId: string) {
    const key = editorMutationKey.question(questionId)
    coordinator.unblock(key)
    useEditorStore.getState().restoreQuestionBaseline(questionId)
    useEditorStore.getState().clearMutationState(key)
    toast.success("已恢复服务器版本")
  }

  return { update, retry, useServerVersion }
}
