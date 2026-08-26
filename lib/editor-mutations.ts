import type { Survey } from "@/lib/questions/types"
import { REALTIME_CLIENT_ID_HEADER } from "@/lib/realtime-shared"

export type EditorMutationStatus =
  | "idle"
  | "pending"
  | "saved"
  | "failed"
  | "conflict"

export type EditorMutationState = {
  status: EditorMutationStatus
  message?: string
  updatedAt: number
}

export type SurveyDetailsDraft = Pick<
  Survey,
  "title" | "description" | "settings"
>

export type PersistedSurveyDetails = SurveyDetailsDraft &
  Pick<Survey, "detailsRevision">

export const editorMutationKey = {
  question: (questionId: string) => `question:${questionId}`,
  create: (operationId: string) => `question-create:${operationId}`,
  order: (surveyId: string) => `survey-order:${surveyId}`,
  surveyDetails: (surveyId: string) => `survey-details:${surveyId}`,
} as const

export function getEditorMutationHeaders(clientId: string | null) {
  return {
    "Content-Type": "application/json",
    ...(clientId ? { [REALTIME_CLIENT_ID_HEADER]: clientId } : {}),
  }
}

/**
 * Serializes mutations for the same resource while allowing unrelated
 * resources to save independently. A rejected mutation never poisons the
 * queue: a later explicit retry can still run.
 */
export class KeyedMutationCoordinator {
  private queues = new Map<string, Promise<void>>()
  private blockedKeys = new Set<string>()

  enqueue(key: string, mutation: () => Promise<void>): Promise<void> {
    const current = this.queues.get(key) ?? Promise.resolve()
    const run = async () => {
      if (this.blockedKeys.has(key)) return
      await mutation()
    }
    const queued = current.then(run, run)
    this.queues.set(key, queued)

    const clear = () => {
      if (this.queues.get(key) === queued) {
        this.queues.delete(key)
      }
    }
    void queued.then(clear, clear)

    return queued
  }

  hasPending(key?: string): boolean {
    return key ? this.queues.has(key) : this.queues.size > 0
  }

  block(key: string): void {
    this.blockedKeys.add(key)
  }

  unblock(key: string): void {
    this.blockedKeys.delete(key)
  }

  async waitForIdle(): Promise<void> {
    while (this.queues.size > 0) {
      await Promise.allSettled([...this.queues.values()])
    }
  }

  async waitForKey(key: string): Promise<void> {
    await (this.queues.get(key) ?? Promise.resolve())
  }
}

export class MutationRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string
  ) {
    super(message)
    this.name = "MutationRequestError"
  }
}
