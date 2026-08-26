import type { Question, Survey, SurveySettings } from "@/lib/questions/types"
import type { LockInfo } from "@/lib/realtime-shared"

export type SurveyQuestionSnapshot = {
  id: string
  type: string
  title: string
  description: string | null
  required: boolean
  order: number
  revision: number
  config: Record<string, unknown> | null
  lockedBy?: string | null
  lockedAt?: string | null
}

export type SurveySnapshot = {
  id: string
  title: string
  description: string | null
  published: boolean
  structureRevision: number
  detailsRevision: number
  userId: string
  settings?: SurveySettings
  questions?: SurveyQuestionSnapshot[]
}

export type PersistedQuestionResponse = SurveyQuestionSnapshot & {
  structureRevision?: number
}

export type PersistedSurveyDetailsResponse = {
  title: string
  description: string | null
  settings?: SurveySettings | null
  detailsRevision: number
}

export function toEditorQuestion(question: SurveyQuestionSnapshot): Question {
  return {
    id: question.id,
    type: question.type,
    title: question.title,
    description: question.description ?? undefined,
    required: question.required,
    order: question.order,
    revision: question.revision,
    config: question.config ?? {},
  } as Question
}

export function toEditorSurvey(snapshot: SurveySnapshot): Survey {
  return {
    id: snapshot.id,
    title: snapshot.title,
    description: snapshot.description,
    published: snapshot.published,
    structureRevision: snapshot.structureRevision ?? 0,
    detailsRevision: snapshot.detailsRevision ?? 0,
    userId: snapshot.userId,
    settings: snapshot.settings,
    questions: (snapshot.questions ?? []).map(toEditorQuestion),
  }
}

export function toLockedQuestions(
  snapshot: SurveySnapshot,
  currentUserId: string | null
): Map<string, LockInfo> {
  const locks = new Map<string, LockInfo>()

  for (const question of snapshot.questions ?? []) {
    if (!question.lockedBy || question.lockedBy === currentUserId) continue
    locks.set(question.id, {
      questionId: question.id,
      userId: question.lockedBy,
      userName: null,
      lockedAt: question.lockedAt
        ? new Date(question.lockedAt).toISOString()
        : new Date().toISOString(),
    })
  }

  return locks
}
