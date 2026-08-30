import type { Question, Survey, SurveySettings } from "@/lib/questions/types"
import type {
  LockInfo,
  QuestionData,
  SyncEventData,
} from "@/lib/realtime-shared"

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

export type RemoteQuestionsCreatedPayload = {
  questions: Question[]
  structureRevision: number
}

export type RemoteQuestionDeletedPayload = {
  questionId: string
  structureRevision: number
}

export type RemoteQuestionsReorderedPayload = {
  questions: Array<{ id: string; order: number }>
  structureRevision: number
}

export type RemoteSurveyDetailsPayload = Omit<
  PersistedSurveyDetailsResponse,
  "settings"
> & {
  settings?: SurveySettings
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

function toEditorQuestionData(
  question: Partial<QuestionData>
): Question | null {
  if (
    typeof question.id !== "string" ||
    typeof question.type !== "string" ||
    typeof question.title !== "string" ||
    (question.description !== undefined &&
      typeof question.description !== "string") ||
    typeof question.required !== "boolean" ||
    !Number.isInteger(question.order) ||
    (question.order ?? -1) < 0 ||
    !Number.isInteger(question.revision) ||
    (question.revision ?? -1) < 0 ||
    !question.config ||
    typeof question.config !== "object" ||
    Array.isArray(question.config)
  ) {
    return null
  }

  return toEditorQuestion({
    id: question.id,
    type: question.type,
    title: question.title,
    description: question.description ?? null,
    required: question.required,
    order: question.order!,
    revision: question.revision!,
    config: question.config,
  })
}

export function toEditorQuestionFromSyncEvent(data: unknown): Question | null {
  if (!data || typeof data !== "object") return null

  const event = data as Partial<SyncEventData>
  const question = event.question
  if (!event.questionId || !question || event.questionId !== question.id) {
    return null
  }

  return toEditorQuestionData(question)
}

export function toRemoteQuestionsCreatedPayload(
  data: unknown
): RemoteQuestionsCreatedPayload | null {
  if (!data || typeof data !== "object") return null

  const event = data as Partial<SyncEventData>
  if (
    !Number.isInteger(event.structureRevision) ||
    (event.structureRevision ?? -1) < 0
  ) {
    return null
  }

  const rawQuestions =
    event.questions ?? (event.question ? [event.question] : [])
  if (rawQuestions.length === 0) return null

  const questions = rawQuestions.map((question) =>
    toEditorQuestionData(question as Partial<QuestionData>)
  )
  if (questions.some((question) => question === null)) return null

  const parsed = questions as Question[]
  if (
    new Set(parsed.map((question) => question.id)).size !== parsed.length ||
    new Set(parsed.map((question) => question.order)).size !== parsed.length
  ) {
    return null
  }

  return {
    questions: parsed,
    structureRevision: event.structureRevision!,
  }
}

export function toRemoteQuestionDeletedPayload(
  data: unknown
): RemoteQuestionDeletedPayload | null {
  if (!data || typeof data !== "object") return null

  const event = data as Partial<SyncEventData>
  if (
    typeof event.questionId !== "string" ||
    !event.questionId ||
    !Number.isInteger(event.structureRevision) ||
    (event.structureRevision ?? -1) < 0
  ) {
    return null
  }

  return {
    questionId: event.questionId,
    structureRevision: event.structureRevision!,
  }
}

export function toRemoteQuestionsReorderedPayload(
  data: unknown
): RemoteQuestionsReorderedPayload | null {
  if (!data || typeof data !== "object") return null

  const event = data as Partial<SyncEventData>
  if (
    !Array.isArray(event.questions) ||
    event.questions.length === 0 ||
    !Number.isInteger(event.structureRevision) ||
    (event.structureRevision ?? -1) < 0
  ) {
    return null
  }

  const questions = event.questions.map((question) => ({
    id: question.id,
    order: question.order,
  }))
  if (
    questions.some(
      (question) =>
        typeof question.id !== "string" ||
        !question.id ||
        !Number.isInteger(question.order) ||
        question.order < 0
    ) ||
    new Set(questions.map((question) => question.id)).size !==
      questions.length ||
    new Set(questions.map((question) => question.order)).size !==
      questions.length ||
    ![...questions]
      .sort((left, right) => left.order - right.order)
      .every((question, index) => question.order === index)
  ) {
    return null
  }

  return {
    questions,
    structureRevision: event.structureRevision!,
  }
}

export function toRemoteSurveyDetailsPayload(
  data: unknown
): RemoteSurveyDetailsPayload | null {
  if (!data || typeof data !== "object") return null

  const event = data as Partial<SyncEventData>
  const survey = event.survey
  if (
    !survey ||
    typeof survey.title !== "string" ||
    (survey.description !== undefined &&
      survey.description !== null &&
      typeof survey.description !== "string") ||
    (survey.settings !== undefined &&
      survey.settings !== null &&
      (typeof survey.settings !== "object" ||
        Array.isArray(survey.settings))) ||
    !Number.isInteger(survey.detailsRevision) ||
    (survey.detailsRevision ?? -1) < 0
  ) {
    return null
  }

  return {
    title: survey.title,
    description: survey.description ?? null,
    settings: (survey.settings ?? undefined) as SurveySettings | undefined,
    detailsRevision: survey.detailsRevision!,
  }
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
