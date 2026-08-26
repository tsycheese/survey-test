import { AlertTriangle, CheckCircle2, Loader2, RefreshCw } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { EditorMutationState } from "@/lib/editor-mutations"

export function EditorSaveStatus({
  mutationStates,
  pendingCreateCount,
  surveyMutationState,
  onRetrySurvey,
  onUseServerSurvey,
}: {
  mutationStates: Record<string, EditorMutationState>
  pendingCreateCount: number
  surveyMutationState?: EditorMutationState
  onRetrySurvey?: () => void
  onUseServerSurvey?: () => void
}) {
  const states = Object.values(mutationStates)
  const failedCount = states.filter(
    (state) => state.status === "failed" || state.status === "conflict"
  ).length
  const pendingCount =
    pendingCreateCount +
    states.filter((state) => state.status === "pending").length

  if (failedCount > 0) {
    return (
      <div className="flex items-center gap-1 text-xs font-medium text-destructive">
        <AlertTriangle className="h-3.5 w-3.5" />
        {failedCount} 项未保存
        {(surveyMutationState?.status === "failed" ||
          surveyMutationState?.status === "conflict") &&
          onRetrySurvey && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={onRetrySurvey}
            >
              <RefreshCw className="mr-1 h-3 w-3" />
              {surveyMutationState.status === "conflict"
                ? "保留我的修改"
                : "重试问卷"}
            </Button>
          )}
        {surveyMutationState?.status === "conflict" && onUseServerSurvey && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={onUseServerSurvey}
          >
            使用服务器版本
          </Button>
        )}
      </div>
    )
  }
  if (pendingCount > 0) {
    return (
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        保存中
      </span>
    )
  }
  if (states.some((state) => state.status === "saved")) {
    return (
      <span className="flex items-center gap-1 text-xs text-green-600">
        <CheckCircle2 className="h-3.5 w-3.5" />
        已保存
      </span>
    )
  }
  return null
}

export function QuestionSaveStatus({
  state,
  onRetry,
  onUseServer,
}: {
  state: EditorMutationState
  onRetry: () => void
  onUseServer: () => void
}) {
  if (state.status === "failed" || state.status === "conflict") {
    return (
      <div className="flex items-center gap-2 border-b bg-destructive/5 px-4 py-2 text-xs text-destructive">
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
        <span className="min-w-0 flex-1 truncate">
          {state.message ||
            (state.status === "conflict" ? "内容发生冲突" : "保存失败")}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs"
          onClick={onRetry}
        >
          <RefreshCw className="mr-1 h-3 w-3" />
          {state.status === "conflict" ? "保留我的修改" : "重试"}
        </Button>
        {state.status === "conflict" && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={onUseServer}
          >
            使用服务器版本
          </Button>
        )}
      </div>
    )
  }
  return null
}
