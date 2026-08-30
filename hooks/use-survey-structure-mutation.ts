"use client"

import { arrayMove } from "@dnd-kit/sortable"
import { toast } from "sonner"
import {
  editorMutationKey,
  getEditorMutationHeaders,
  MutationRequestError,
  type KeyedMutationCoordinator,
} from "@/lib/editor-mutations"
import type { PersistedQuestionResponse } from "@/lib/editor-snapshots"
import { useEditorStore } from "@/lib/editor-store"
import { createQuestion } from "@/lib/questions/registry"
import type { Question, QuestionType } from "@/lib/questions/types"
import { PERFORMANCE_LOGS_ENABLED } from "@/lib/performance-logging"
import type { LockInfo } from "@/lib/realtime-shared"

function waitForNextPaint(): Promise<number> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve(performance.now()))
    })
  })
}

type UseSurveyStructureMutationOptions = {
  surveyId: string
  clientId: string | null
  currentUserId: string | null
  lockedQuestions: Map<string, LockInfo>
  coordinator: KeyedMutationCoordinator
  reconcileFromServer: (reason: string) => Promise<void>
  scheduleReconciliation: (reason: string, delay?: number) => void
  onCreated?: () => void
}

export function useSurveyStructureMutation({
  surveyId,
  clientId,
  currentUserId,
  lockedQuestions,
  coordinator,
  reconcileFromServer,
  scheduleReconciliation,
  onCreated,
}: UseSurveyStructureMutationOptions) {
  function create(
    type: QuestionType,
    requestedIndex: number,
    showSuccessToast = false
  ): Promise<void> {
    const store = useEditorStore.getState()
    const latestSurvey = store.survey
    if (!latestSurvey || latestSurvey.id !== surveyId) return Promise.resolve()

    const targetSurveyId = latestSurvey.id
    const index = Math.min(
      Math.max(requestedIndex, 0),
      latestSurvey.questions.length
    )
    const operationId = crypto.randomUUID()
    const requestId = operationId
    const temporaryId = `temporary-${operationId}`
    const clickStartedAt = performance.now()
    const questionCountBefore = latestSurvey.questions.length
    const visibilityStateAtClick = document.visibilityState
    const question = {
      ...createQuestion(type, index),
      id: temporaryId,
      revision: 0,
    }

    store.addPendingQuestion(question)
    const optimisticStateUpdatedAt = performance.now()
    const optimisticPaintPromise = waitForNextPaint()

    const persistQuestion = async () => {
      const requestStartedAt = performance.now()
      let saveAttempts = 0

      try {
        const requestBody = JSON.stringify({
          operationId,
          title: question.title,
          type: question.type,
          required: question.required,
          order: index,
          config: question.config,
        })
        const sendCreateRequest = async (): Promise<Response> => {
          let lastNetworkError: unknown

          for (let attempt = 1; attempt <= 3; attempt += 1) {
            saveAttempts = attempt
            try {
              const response = await fetch(
                `/api/surveys/${targetSurveyId}/questions`,
                {
                  method: "POST",
                  headers: {
                    ...getEditorMutationHeaders(clientId, requestId),
                  },
                  body: requestBody,
                }
              )
              if (response.ok || response.status < 500 || attempt === 3) {
                return response
              }
            } catch (error) {
              lastNetworkError = error
              if (attempt === 3) throw error
            }

            await new Promise((resolve) => setTimeout(resolve, attempt * 150))
          }

          throw lastNetworkError ?? new Error("创建题目请求失败")
        }

        const response = await sendCreateRequest()
        const responseReceivedAt = performance.now()
        if (!response.ok) {
          throw new Error(`创建题目失败：HTTP ${response.status}`)
        }

        const created = (await response.json()) as PersistedQuestionResponse
        const responseParsedAt = performance.now()
        const currentState = useEditorStore.getState()
        const canApply =
          currentState.survey?.id === targetSurveyId &&
          currentState.pendingQuestionIds.has(temporaryId)

        if (canApply) {
          currentState.confirmPendingQuestion(targetSurveyId, temporaryId, {
            ...question,
            id: created.id,
            order: created.order,
            revision: created.revision,
          })
          if (typeof created.structureRevision === "number") {
            useEditorStore
              .getState()
              .setStructureRevision(created.structureRevision)
          }
        }
        const confirmedAt = performance.now()
        const [optimisticPaintedAt, confirmedPaintedAt] = await Promise.all([
          optimisticPaintPromise,
          canApply ? waitForNextPaint() : Promise.resolve(confirmedAt),
        ])

        if (showSuccessToast && canApply) {
          onCreated?.()
          toast.success("题目已添加")
        }

        if (PERFORMANCE_LOGS_ENABLED) {
          console.groupCollapsed(
            `[Question Add Performance] ${requestId.slice(0, 8)}`
          )
          console.table([
            {
              phase: "乐观状态更新",
              duration: `${(optimisticStateUpdatedAt - clickStartedAt).toFixed(1)}ms`,
            },
            {
              phase: "点击到乐观绘制",
              duration: `${(optimisticPaintedAt - clickStartedAt).toFixed(1)}ms`,
            },
            {
              phase: "后台队列等待",
              duration: `${(requestStartedAt - optimisticStateUpdatedAt).toFixed(1)}ms`,
            },
            {
              phase: "保存请求往返",
              duration: `${(responseReceivedAt - requestStartedAt).toFixed(1)}ms`,
            },
            {
              phase: "正式 ID 确认",
              duration: `${(confirmedAt - responseParsedAt).toFixed(1)}ms`,
            },
            {
              phase: "点击到持久化完成",
              duration: `${(confirmedPaintedAt - clickStartedAt).toFixed(1)}ms`,
            },
          ])
          console.info(
            "Server-Timing:",
            response.headers.get("server-timing") ?? "无"
          )
          console.info("Test Context:", {
            questionType: type,
            questionCountBefore,
            requestedIndex: index,
            saveAttempts,
            idempotentReplay:
              response.headers.get("x-idempotent-replay") === "true",
            visibilityStateAtClick,
            visibilityStateAtPaint: document.visibilityState,
          })
          console.info("Request ID:", requestId)
          console.groupEnd()
        }
      } catch (error) {
        const currentState = useEditorStore.getState()
        const canApply =
          currentState.survey?.id === targetSurveyId &&
          currentState.pendingQuestionIds.has(temporaryId)
        if (canApply) {
          currentState.rollbackPendingQuestion(targetSurveyId, temporaryId)
          await waitForNextPaint()
        }
        console.error("[Question Add Error] 保存失败", {
          requestId,
          saveAttempts,
          rolledBack: canApply,
          ...(PERFORMANCE_LOGS_ENABLED
            ? {
                duration: `${(performance.now() - clickStartedAt).toFixed(1)}ms`,
              }
            : {}),
          error,
        })
        if (canApply) toast.error("添加失败，已撤销临时题目")
      }
    }

    return coordinator.enqueue(
      `survey-create:${targetSurveyId}`,
      persistQuestion
    )
  }

  async function addBatch(questions: Question[]) {
    const latestSurvey = useEditorStore.getState().survey
    if (!latestSurvey || latestSurvey.id !== surveyId) return
    if (questions.length === 0) return

    const targetSurveyId = latestSurvey.id
    const batchId = crypto.randomUUID()
    const submissions = questions.map((question) => ({
      operationId: crypto.randomUUID(),
      title: question.title,
      description: question.description,
      type: question.type,
      required: question.required,
      config: question.config,
    }))

    return coordinator.enqueue(`survey-create:${targetSurveyId}`, async () => {
      const currentSurvey = useEditorStore.getState().survey
      if (!currentSurvey || currentSurvey.id !== targetSurveyId) return

      const response = await fetch(
        `/api/surveys/${targetSurveyId}/questions/batch`,
        {
          method: "POST",
          headers: getEditorMutationHeaders(clientId),
          body: JSON.stringify({
            batchId,
            expectedStructureRevision: currentSurvey.structureRevision,
            questions: submissions,
          }),
        }
      )
      const data = (await response.json().catch(() => ({}))) as {
        error?: string
        code?: string
        questions?: PersistedQuestionResponse[]
        structureRevision?: number
      }
      if (!response.ok || !data.questions) {
        if (response.status === 409) {
          await reconcileFromServer("batch-create-conflict")
        }
        throw new MutationRequestError(
          data.error || "批量添加题目失败",
          response.status,
          data.code
        )
      }

      const latestState = useEditorStore.getState()
      if (latestState.survey?.id !== targetSurveyId) return

      data.questions.forEach((created, index) => {
        latestState.addQuestion({
          ...questions[index],
          id: created.id,
          order: created.order,
          revision: created.revision,
        })
      })
      if (typeof data.structureRevision === "number") {
        useEditorStore.getState().setStructureRevision(data.structureRevision)
      }
    })
  }

  async function remove(questionId: string) {
    const currentQuestion = useEditorStore
      .getState()
      .survey?.questions.find((question) => question.id === questionId)
    if (!currentQuestion) return
    const lock = lockedQuestions.get(questionId)
    if (
      !clientId ||
      !lock ||
      lock.userId !== currentUserId ||
      lock.lockClientId !== clientId
    ) {
      toast.error("题目租约已失效，请重新选择题目后删除")
      return
    }

    const response = await fetch(
      `/api/surveys/${surveyId}/questions/${questionId}`,
      {
        method: "DELETE",
        headers: getEditorMutationHeaders(clientId, undefined, lock.lockId),
        body: JSON.stringify({
          expectedRevision: currentQuestion.revision ?? 0,
        }),
      }
    )
    if (response.ok) {
      const data = (await response.json()) as { structureRevision?: number }
      useEditorStore.getState().deleteQuestion(questionId)
      if (typeof data.structureRevision === "number") {
        useEditorStore.getState().setStructureRevision(data.structureRevision)
      }
      return
    }

    const data = (await response.json().catch(() => ({}))) as { error?: string }
    toast.error(data.error || "删除失败")
    if (response.status === 409) {
      scheduleReconciliation("delete-conflict", 0)
    }
  }

  function reorder(fromIndex: number, toIndex: number) {
    const survey = useEditorStore.getState().survey
    if (!survey || survey.id !== surveyId) return
    if (useEditorStore.getState().pendingQuestionIds.size > 0) {
      toast.info("请等待新题目保存完成后再调整顺序")
      return
    }
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return

    const newQuestions = arrayMove(survey.questions, fromIndex, toIndex).map(
      (question, order) => ({ ...question, order })
    )
    useEditorStore.getState().reorderQuestions(fromIndex, toIndex)

    const key = editorMutationKey.order(surveyId)
    coordinator.unblock(key)
    useEditorStore.getState().setMutationState(key, "pending")

    void coordinator.enqueue(key, async () => {
      useEditorStore.getState().setMutationState(key, "pending")
      try {
        const expectedStructureRevision =
          useEditorStore.getState().survey?.structureRevision ?? 0
        const response = await fetch(
          `/api/surveys/${surveyId}/questions/reorder`,
          {
            method: "PUT",
            headers: getEditorMutationHeaders(clientId),
            body: JSON.stringify({
              expectedStructureRevision,
              questions: newQuestions.map((question) => ({
                id: question.id,
                order: question.order,
              })),
            }),
          }
        )
        const data = (await response.json().catch(() => ({}))) as {
          error?: string
          code?: string
          structureRevision?: number
        }
        if (!response.ok) {
          throw new MutationRequestError(
            data.error || "更新题目顺序失败",
            response.status,
            data.code
          )
        }

        if (typeof data.structureRevision === "number") {
          useEditorStore.getState().setStructureRevision(data.structureRevision)
        }
        useEditorStore.getState().setMutationState(key, "saved")
      } catch (error) {
        coordinator.block(key)
        const isConflict =
          error instanceof MutationRequestError && error.status === 409
        const message =
          error instanceof Error ? error.message : "更新题目顺序失败"
        useEditorStore
          .getState()
          .setMutationState(key, isConflict ? "conflict" : "failed", message)
        toast.error(message)
        await reconcileFromServer("reorder-failed")
        useEditorStore.getState().clearMutationState(key)
      }
    })
  }

  return { create, addBatch, remove, reorder }
}
