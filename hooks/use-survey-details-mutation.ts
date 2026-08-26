"use client"

import { useEffect, useRef } from "react"
import { toast } from "sonner"
import {
  editorMutationKey,
  getEditorMutationHeaders,
  MutationRequestError,
  type KeyedMutationCoordinator,
  type PersistedSurveyDetails,
  type SurveyDetailsDraft,
} from "@/lib/editor-mutations"
import { useEditorStore } from "@/lib/editor-store"
import type { PersistedSurveyDetailsResponse } from "@/lib/editor-snapshots"
import type { SurveySettings } from "@/lib/questions/types"

function toSurveyDetails(): SurveyDetailsDraft | null {
  const survey = useEditorStore.getState().survey
  if (!survey) return null
  return {
    title: survey.title,
    description: survey.description,
    settings: survey.settings,
  }
}

type UseSurveyDetailsMutationOptions = {
  surveyId: string
  clientId: string | null
  coordinator: KeyedMutationCoordinator
}

export function useSurveyDetailsMutation({
  surveyId,
  clientId,
  coordinator,
}: UseSurveyDetailsMutationOptions) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const draftVersionRef = useRef(0)
  const enqueuedVersionRef = useRef(-1)

  function enqueueSave(): Promise<void> {
    const latestSurvey = useEditorStore.getState().survey
    const submitted = toSurveyDetails()
    if (!latestSurvey || latestSurvey.id !== surveyId || !submitted) {
      return Promise.resolve()
    }

    const submittedVersion = draftVersionRef.current
    const key = editorMutationKey.surveyDetails(surveyId)
    enqueuedVersionRef.current = submittedVersion
    coordinator.unblock(key)
    useEditorStore.getState().setMutationState(key, "pending")

    return coordinator.enqueue(key, async () => {
      useEditorStore.getState().setMutationState(key, "pending")

      try {
        const expectedDetailsRevision =
          useEditorStore.getState().surveyDetailsBaseline?.detailsRevision ??
          latestSurvey.detailsRevision
        const response = await fetch(`/api/surveys/${surveyId}`, {
          method: "PUT",
          headers: getEditorMutationHeaders(clientId),
          body: JSON.stringify({
            expectedDetailsRevision,
            title: submitted.title,
            description: submitted.description,
            settings: submitted.settings,
          }),
        })
        const data = (await response.json().catch(() => ({}))) as
          | PersistedSurveyDetailsResponse
          | {
              error?: string
              code?: string
              current?: PersistedSurveyDetails
            }

        if (!response.ok) {
          const errorData = data as {
            error?: string
            code?: string
            current?: PersistedSurveyDetails
          }
          if (errorData.current) {
            useEditorStore.getState().setSurveyDetailsBaseline({
              ...errorData.current,
              settings: errorData.current.settings ?? undefined,
            })
          }
          throw new MutationRequestError(
            errorData.error || "保存问卷失败",
            response.status,
            errorData.code
          )
        }

        const persisted = data as PersistedSurveyDetailsResponse
        useEditorStore.getState().commitSurveyMutation(submitted, {
          title: persisted.title,
          description: persisted.description,
          settings: persisted.settings ?? undefined,
          detailsRevision: persisted.detailsRevision,
        })
        if (submittedVersion === draftVersionRef.current) {
          useEditorStore.getState().setMutationState(key, "saved")
        }
      } catch (error) {
        coordinator.block(key)
        const isConflict =
          error instanceof MutationRequestError && error.status === 409
        const message =
          error instanceof Error ? error.message : "保存问卷失败，请稍后重试"
        useEditorStore
          .getState()
          .setMutationState(key, isConflict ? "conflict" : "failed", message)
        toast.error(message)
      }
    })
  }

  function scheduleSave() {
    draftVersionRef.current += 1
    useEditorStore
      .getState()
      .setMutationState(editorMutationKey.surveyDetails(surveyId), "pending")

    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      timerRef.current = null
      void enqueueSave()
    }, 500)
  }

  function flushSave(): Promise<void> {
    const key = editorMutationKey.surveyDetails(surveyId)
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    } else if (
      enqueuedVersionRef.current === draftVersionRef.current &&
      coordinator.hasPending(key)
    ) {
      return coordinator.waitForKey(key)
    }
    return enqueueSave()
  }

  function saveNow(): Promise<void> {
    draftVersionRef.current += 1
    return flushSave()
  }

  function updateSettings(settings: SurveySettings) {
    const latestSurvey = useEditorStore.getState().survey
    if (!latestSurvey || latestSurvey.id !== surveyId) return
    useEditorStore
      .getState()
      .updateSurveySettings({ ...latestSurvey.settings, ...settings })
    void saveNow()
  }

  function retry() {
    enqueuedVersionRef.current = -1
    void flushSave()
  }

  function useServerVersion() {
    const key = editorMutationKey.surveyDetails(surveyId)
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    draftVersionRef.current += 1
    enqueuedVersionRef.current = -1
    coordinator.unblock(key)
    useEditorStore.getState().restoreSurveyDetailsBaseline()
    useEditorStore.getState().clearMutationState(key)
    toast.success("已恢复服务器版本")
  }

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    },
    [surveyId]
  )

  return {
    scheduleSave,
    flushSave,
    saveNow,
    updateSettings,
    retry,
    useServerVersion,
  }
}
