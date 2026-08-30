import { create } from "zustand"
import type { Question, Survey } from "@/lib/questions/types"
import type {
  EditorMutationState,
  EditorMutationStatus,
  PersistedSurveyDetails,
  SurveyDetailsDraft,
} from "@/lib/editor-mutations"
import { editorMutationKey } from "@/lib/editor-mutations"

function questionContentEquals(left: Question, right: Question): boolean {
  return (
    left.type === right.type &&
    left.title === right.title &&
    left.description === right.description &&
    left.required === right.required &&
    JSON.stringify(left.config) === JSON.stringify(right.config)
  )
}

function surveyDetailsEqual(
  left: SurveyDetailsDraft,
  right: SurveyDetailsDraft
): boolean {
  return (
    left.title === right.title &&
    left.description === right.description &&
    JSON.stringify(left.settings) === JSON.stringify(right.settings)
  )
}

function alignQuestionBaselines(
  baselines: Record<string, Question>,
  questions: Question[]
): Record<string, Question> {
  return Object.fromEntries(
    questions.map((question) => {
      const baseline = baselines[question.id]
      return [
        question.id,
        baseline
          ? ({ ...baseline, order: question.order } as Question)
          : question,
      ]
    })
  )
}

const PROTECTED_MUTATION_STATUSES = new Set<EditorMutationStatus>([
  "pending",
  "failed",
  "conflict",
])

export type RemoteEditorEventOutcome = {
  status: "applied" | "ignored" | "fallback"
  reason:
    | "newer-revision"
    | "stale-revision"
    | "duplicate-revision"
    | "revision-content-mismatch"
    | "survey-unavailable"
    | "question-unavailable"
    | "baseline-unavailable"
    | "local-draft"
    | "mutation-protected"
    | "revision-gap"
    | "state-mismatch"
    | "local-structure-pending"
    | "structure-mutation-protected"
    | "survey-details-unavailable"
    | "local-survey-draft"
  knownRevision: number | null
  incomingRevision: number
}

export type RemoteQuestionUpdateOutcome = RemoteEditorEventOutcome

type EditorStore = {
  survey: Survey | null
  selectedId: string | null
  pendingQuestionIds: Set<string>
  questionBaselines: Record<string, Question>
  surveyDetailsBaseline: PersistedSurveyDetails | null
  mutationStates: Record<string, EditorMutationState>

  setSurvey: (survey: Survey) => void
  reconcileSurvey: (survey: Survey) => void
  selectQuestion: (id: string | null) => void
  addQuestion: (question: Question) => void
  addPendingQuestion: (question: Question) => void
  confirmPendingQuestion: (
    surveyId: string,
    temporaryId: string,
    persistedQuestion: Question
  ) => void
  rollbackPendingQuestion: (surveyId: string, temporaryId: string) => void
  updateQuestion: (question: Question) => void
  commitQuestionMutation: (submitted: Question, persisted: Question) => void
  applyRemoteQuestionUpdate: (
    surveyId: string,
    question: Question
  ) => RemoteQuestionUpdateOutcome
  applyRemoteQuestionsCreated: (
    surveyId: string,
    questions: Question[],
    structureRevision: number
  ) => RemoteEditorEventOutcome
  applyRemoteQuestionDeleted: (
    surveyId: string,
    questionId: string,
    structureRevision: number
  ) => RemoteEditorEventOutcome
  applyRemoteQuestionsReordered: (
    surveyId: string,
    questions: Array<{ id: string; order: number }>,
    structureRevision: number
  ) => RemoteEditorEventOutcome
  applyRemoteSurveyDetails: (
    surveyId: string,
    details: PersistedSurveyDetails
  ) => RemoteEditorEventOutcome
  restoreQuestionBaseline: (id: string) => void
  setQuestionBaseline: (question: Question) => void
  commitSurveyMutation: (
    submitted: SurveyDetailsDraft,
    persisted: PersistedSurveyDetails
  ) => void
  setSurveyDetailsBaseline: (details: PersistedSurveyDetails) => void
  restoreSurveyDetailsBaseline: () => void
  setMutationState: (
    key: string,
    status: EditorMutationStatus,
    message?: string
  ) => void
  clearMutationState: (key: string) => void
  setStructureRevision: (revision: number) => void
  updateSurveySettings: (settings: Survey["settings"]) => void
  setPublished: (published: boolean) => void
  deleteQuestion: (id: string) => void
  reorderQuestions: (fromIndex: number, toIndex: number) => void
  updateSurveyInfo: (title: string, description: string) => void
}

export const useEditorStore = create<EditorStore>((set) => ({
  survey: null,
  selectedId: null,
  pendingQuestionIds: new Set(),
  questionBaselines: {},
  surveyDetailsBaseline: null,
  mutationStates: {},

  setSurvey: (survey) =>
    set((s) => {
      const questionIds = new Set(
        survey.questions.map((question) => question.id)
      )
      const pendingQuestionIds = new Set(
        [...s.pendingQuestionIds].filter((id) => questionIds.has(id))
      )

      return {
        survey,
        selectedId: null,
        pendingQuestionIds,
        questionBaselines: Object.fromEntries(
          survey.questions.map((question) => [question.id, question])
        ),
        surveyDetailsBaseline: {
          title: survey.title,
          description: survey.description,
          settings: survey.settings,
          detailsRevision: survey.detailsRevision,
        },
        mutationStates: {},
      }
    }),

  reconcileSurvey: (survey) =>
    set((s) => {
      if (!s.survey || s.survey.id !== survey.id) return s

      const surveyMutation =
        s.mutationStates[editorMutationKey.surveyDetails(survey.id)]
      const protectsSurveyDraft =
        surveyMutation?.status === "pending" ||
        surveyMutation?.status === "failed" ||
        surveyMutation?.status === "conflict"

      const pendingQuestions = s.survey.questions.filter((question) =>
        s.pendingQuestionIds.has(question.id)
      )
      const incomingBaselines = Object.fromEntries(
        survey.questions.map((question) => [question.id, question])
      )
      const questions = survey.questions.map((question) => {
        const mutation = s.mutationStates[`question:${question.id}`]
        const localQuestion = s.survey?.questions.find(
          (item) => item.id === question.id
        )
        const protectsDraft =
          mutation?.status === "pending" ||
          mutation?.status === "failed" ||
          mutation?.status === "conflict"

        if (!protectsDraft || !localQuestion) return question

        return {
          ...question,
          ...localQuestion,
          order: question.order,
          revision: question.revision,
        } as Question
      })

      for (const pendingQuestion of pendingQuestions) {
        if (questions.some((question) => question.id === pendingQuestion.id)) {
          continue
        }

        const insertionIndex = Math.min(
          Math.max(pendingQuestion.order, 0),
          questions.length
        )
        questions.splice(insertionIndex, 0, pendingQuestion)
      }

      const normalizedQuestions = questions.map((question, order) =>
        question.order === order ? question : { ...question, order }
      )
      const selectedId = normalizedQuestions.some(
        (question) => question.id === s.selectedId
      )
        ? s.selectedId
        : null

      return {
        survey: {
          ...survey,
          ...(protectsSurveyDraft
            ? {
                title: s.survey.title,
                description: s.survey.description,
                settings: s.survey.settings,
              }
            : {}),
          questions: normalizedQuestions,
        },
        selectedId,
        questionBaselines: {
          ...s.questionBaselines,
          ...incomingBaselines,
        },
        surveyDetailsBaseline: {
          title: survey.title,
          description: survey.description,
          settings: survey.settings,
          detailsRevision: survey.detailsRevision,
        },
      }
    }),

  selectQuestion: (id) => set({ selectedId: id }),

  addQuestion: (question) =>
    set((s) => {
      if (!s.survey) return s
      return {
        survey: { ...s.survey, questions: [...s.survey.questions, question] },
        selectedId: question.id,
      }
    }),

  addPendingQuestion: (question) =>
    set((s) => {
      if (!s.survey) return s

      const pendingQuestionIds = new Set(s.pendingQuestionIds)
      pendingQuestionIds.add(question.id)
      const insertionIndex = Math.min(
        Math.max(question.order, 0),
        s.survey.questions.length
      )
      const questions = [...s.survey.questions]
      questions.splice(insertionIndex, 0, question)

      return {
        survey: {
          ...s.survey,
          questions: questions.map((item, order) =>
            item.order === order ? item : { ...item, order }
          ),
        },
        selectedId: question.id,
        pendingQuestionIds,
      }
    }),

  confirmPendingQuestion: (surveyId, temporaryId, persistedQuestion) =>
    set((s) => {
      if (
        !s.survey ||
        s.survey.id !== surveyId ||
        !s.pendingQuestionIds.has(temporaryId) ||
        !s.survey.questions.some((question) => question.id === temporaryId)
      ) {
        return s
      }

      const pendingQuestionIds = new Set(s.pendingQuestionIds)
      pendingQuestionIds.delete(temporaryId)

      const persistedQuestionAlreadyExists = s.survey.questions.some(
        (question) => question.id === persistedQuestion.id
      )
      const questions = persistedQuestionAlreadyExists
        ? s.survey.questions.filter((question) => question.id !== temporaryId)
        : s.survey.questions.map((question) =>
            question.id === temporaryId
              ? {
                  ...question,
                  id: persistedQuestion.id,
                  order: persistedQuestion.order,
                }
              : question
          )

      return {
        survey: {
          ...s.survey,
          questions: questions.map((question, order) =>
            question.order === order ? question : { ...question, order }
          ),
        },
        selectedId:
          s.selectedId === temporaryId ? persistedQuestion.id : s.selectedId,
        pendingQuestionIds,
        questionBaselines: {
          ...s.questionBaselines,
          [persistedQuestion.id]: persistedQuestion,
        },
      }
    }),

  rollbackPendingQuestion: (surveyId, temporaryId) =>
    set((s) => {
      if (
        !s.survey ||
        s.survey.id !== surveyId ||
        !s.pendingQuestionIds.has(temporaryId) ||
        !s.survey.questions.some((question) => question.id === temporaryId)
      ) {
        return s
      }

      const pendingQuestionIds = new Set(s.pendingQuestionIds)
      pendingQuestionIds.delete(temporaryId)
      const questions = s.survey.questions.filter(
        (question) => question.id !== temporaryId
      )

      return {
        survey: {
          ...s.survey,
          questions: questions.map((question, order) =>
            question.order === order ? question : { ...question, order }
          ),
        },
        selectedId: s.selectedId === temporaryId ? null : s.selectedId,
        pendingQuestionIds,
      }
    }),

  updateQuestion: (question) =>
    set((s) => {
      if (!s.survey) return s
      return {
        survey: {
          ...s.survey,
          questions: s.survey.questions.map((q) =>
            q.id === question.id ? question : q
          ),
        },
      }
    }),

  commitQuestionMutation: (submitted, persisted) =>
    set((s) => {
      if (!s.survey) return s

      return {
        survey: {
          ...s.survey,
          questions: s.survey.questions.map((current) => {
            if (current.id !== persisted.id) return current
            if (questionContentEquals(current, submitted)) return persisted

            return {
              ...current,
              revision: persisted.revision,
            } as Question
          }),
        },
        questionBaselines: {
          ...s.questionBaselines,
          [persisted.id]: persisted,
        },
      }
    }),

  applyRemoteQuestionUpdate: (surveyId, incoming) => {
    let outcome: RemoteQuestionUpdateOutcome = {
      status: "fallback",
      reason: "survey-unavailable",
      knownRevision: null,
      incomingRevision: incoming.revision ?? 0,
    }

    set((s) => {
      if (!s.survey || s.survey.id !== surveyId) return s

      const current = s.survey.questions.find(
        (question) => question.id === incoming.id
      )
      if (!current) {
        outcome = {
          ...outcome,
          reason: "question-unavailable",
        }
        return s
      }

      const baseline = s.questionBaselines[incoming.id]
      if (!baseline) {
        outcome = {
          ...outcome,
          reason: "baseline-unavailable",
        }
        return s
      }

      const knownRevision = Math.max(
        current.revision ?? 0,
        baseline.revision ?? 0
      )
      const incomingRevision = incoming.revision ?? 0
      const mutationKey = editorMutationKey.question(incoming.id)
      const mutation = s.mutationStates[mutationKey]
      const mutationProtected = Boolean(
        mutation && PROTECTED_MUTATION_STATUSES.has(mutation.status)
      )
      const hasLocalDraft = !questionContentEquals(current, baseline)

      if (incomingRevision < knownRevision) {
        outcome = {
          status: "ignored",
          reason: "stale-revision",
          knownRevision,
          incomingRevision,
        }
        return s
      }

      if (incomingRevision === knownRevision) {
        const contentMatches =
          questionContentEquals(incoming, baseline) ||
          questionContentEquals(incoming, current)
        outcome = {
          status: contentMatches ? "ignored" : "fallback",
          reason: contentMatches
            ? "duplicate-revision"
            : "revision-content-mismatch",
          knownRevision,
          incomingRevision,
        }
        return s
      }

      if (mutationProtected || hasLocalDraft) {
        outcome = {
          status: "fallback",
          reason: mutationProtected ? "mutation-protected" : "local-draft",
          knownRevision,
          incomingRevision,
        }

        if (!mutationProtected && hasLocalDraft) {
          return {
            mutationStates: {
              ...s.mutationStates,
              [mutationKey]: {
                status: "conflict",
                message:
                  "题目已被其他协作者更新，请选择保留本地修改或使用服务器版本",
                updatedAt: Date.now(),
              },
            },
          }
        }

        return s
      }

      const appliedQuestion = {
        ...incoming,
        order: current.order,
      } as Question
      outcome = {
        status: "applied",
        reason: "newer-revision",
        knownRevision,
        incomingRevision,
      }

      return {
        survey: {
          ...s.survey,
          questions: s.survey.questions.map((question) =>
            question.id === appliedQuestion.id ? appliedQuestion : question
          ),
        },
        questionBaselines: {
          ...s.questionBaselines,
          [appliedQuestion.id]: appliedQuestion,
        },
      }
    })

    return outcome
  },

  applyRemoteQuestionsCreated: (
    surveyId,
    incomingQuestions,
    incomingRevision
  ) => {
    let outcome: RemoteEditorEventOutcome = {
      status: "fallback",
      reason: "survey-unavailable",
      knownRevision: null,
      incomingRevision,
    }

    set((s) => {
      if (!s.survey || s.survey.id !== surveyId) return s

      const knownRevision = s.survey.structureRevision
      if (incomingRevision < knownRevision) {
        outcome = {
          status: "ignored",
          reason: "stale-revision",
          knownRevision,
          incomingRevision,
        }
        return s
      }

      if (incomingRevision === knownRevision) {
        const contentMatches = incomingQuestions.every((incoming) => {
          const current = s.survey?.questions.find(
            (question) => question.id === incoming.id
          )
          return (
            current &&
            current.order === incoming.order &&
            questionContentEquals(current, incoming)
          )
        })
        outcome = {
          status: contentMatches ? "ignored" : "fallback",
          reason: contentMatches
            ? "duplicate-revision"
            : "revision-content-mismatch",
          knownRevision,
          incomingRevision,
        }
        return s
      }

      if (incomingRevision !== knownRevision + 1) {
        outcome = {
          status: "fallback",
          reason: "revision-gap",
          knownRevision,
          incomingRevision,
        }
        return s
      }

      const orderMutation = s.mutationStates[editorMutationKey.order(surveyId)]
      if (
        orderMutation &&
        PROTECTED_MUTATION_STATUSES.has(orderMutation.status)
      ) {
        outcome = {
          status: "fallback",
          reason: "structure-mutation-protected",
          knownRevision,
          incomingRevision,
        }
        return s
      }
      if (s.pendingQuestionIds.size > 0) {
        outcome = {
          status: "fallback",
          reason: "local-structure-pending",
          knownRevision,
          incomingRevision,
        }
        return s
      }
      if (
        incomingQuestions.some((incoming) =>
          s.survey?.questions.some((question) => question.id === incoming.id)
        )
      ) {
        outcome = {
          status: "fallback",
          reason: "state-mismatch",
          knownRevision,
          incomingRevision,
        }
        return s
      }

      const questions = [...s.survey.questions]
      for (const incoming of [...incomingQuestions].sort(
        (left, right) => left.order - right.order
      )) {
        questions.splice(
          Math.min(Math.max(incoming.order, 0), questions.length),
          0,
          incoming
        )
      }
      const normalizedQuestions = questions.map((question, order) =>
        question.order === order
          ? question
          : ({ ...question, order } as Question)
      )

      outcome = {
        status: "applied",
        reason: "newer-revision",
        knownRevision,
        incomingRevision,
      }
      return {
        survey: {
          ...s.survey,
          structureRevision: incomingRevision,
          questions: normalizedQuestions,
        },
        questionBaselines: alignQuestionBaselines(
          s.questionBaselines,
          normalizedQuestions
        ),
      }
    })

    return outcome
  },

  applyRemoteQuestionDeleted: (surveyId, questionId, incomingRevision) => {
    let outcome: RemoteEditorEventOutcome = {
      status: "fallback",
      reason: "survey-unavailable",
      knownRevision: null,
      incomingRevision,
    }

    set((s) => {
      if (!s.survey || s.survey.id !== surveyId) return s

      const knownRevision = s.survey.structureRevision
      const current = s.survey.questions.find(
        (question) => question.id === questionId
      )
      if (incomingRevision < knownRevision) {
        outcome = {
          status: "ignored",
          reason: "stale-revision",
          knownRevision,
          incomingRevision,
        }
        return s
      }
      if (incomingRevision === knownRevision) {
        outcome = {
          status: current ? "fallback" : "ignored",
          reason: current ? "state-mismatch" : "duplicate-revision",
          knownRevision,
          incomingRevision,
        }
        return s
      }
      if (incomingRevision !== knownRevision + 1) {
        outcome = {
          status: "fallback",
          reason: "revision-gap",
          knownRevision,
          incomingRevision,
        }
        return s
      }
      if (!current) {
        outcome = {
          status: "fallback",
          reason: "question-unavailable",
          knownRevision,
          incomingRevision,
        }
        return s
      }

      const orderMutation = s.mutationStates[editorMutationKey.order(surveyId)]
      if (
        orderMutation &&
        PROTECTED_MUTATION_STATUSES.has(orderMutation.status)
      ) {
        outcome = {
          status: "fallback",
          reason: "structure-mutation-protected",
          knownRevision,
          incomingRevision,
        }
        return s
      }
      if (s.pendingQuestionIds.size > 0) {
        outcome = {
          status: "fallback",
          reason: "local-structure-pending",
          knownRevision,
          incomingRevision,
        }
        return s
      }

      const baseline = s.questionBaselines[questionId]
      const questionMutation =
        s.mutationStates[editorMutationKey.question(questionId)]
      const mutationProtected = Boolean(
        questionMutation &&
        PROTECTED_MUTATION_STATUSES.has(questionMutation.status)
      )
      const hasLocalDraft = Boolean(
        baseline && !questionContentEquals(current, baseline)
      )
      if (!baseline || mutationProtected || hasLocalDraft) {
        outcome = {
          status: "fallback",
          reason: !baseline
            ? "baseline-unavailable"
            : mutationProtected
              ? "mutation-protected"
              : "local-draft",
          knownRevision,
          incomingRevision,
        }
        return s
      }

      const questions = s.survey.questions
        .filter((question) => question.id !== questionId)
        .map((question, order) =>
          question.order === order
            ? question
            : ({ ...question, order } as Question)
        )
      const mutationStates = { ...s.mutationStates }
      delete mutationStates[editorMutationKey.question(questionId)]

      outcome = {
        status: "applied",
        reason: "newer-revision",
        knownRevision,
        incomingRevision,
      }
      return {
        survey: {
          ...s.survey,
          structureRevision: incomingRevision,
          questions,
        },
        selectedId:
          s.selectedId === questionId
            ? (questions[0]?.id ?? null)
            : s.selectedId,
        questionBaselines: alignQuestionBaselines(
          s.questionBaselines,
          questions
        ),
        mutationStates,
      }
    })

    return outcome
  },

  applyRemoteQuestionsReordered: (
    surveyId,
    incomingQuestions,
    incomingRevision
  ) => {
    let outcome: RemoteEditorEventOutcome = {
      status: "fallback",
      reason: "survey-unavailable",
      knownRevision: null,
      incomingRevision,
    }

    set((s) => {
      if (!s.survey || s.survey.id !== surveyId) return s

      const knownRevision = s.survey.structureRevision
      const incomingOrders = new Map(
        incomingQuestions.map((question) => [question.id, question.order])
      )
      const questionSetMatches =
        incomingOrders.size === s.survey.questions.length &&
        s.survey.questions.every((question) => incomingOrders.has(question.id))

      if (incomingRevision < knownRevision) {
        outcome = {
          status: "ignored",
          reason: "stale-revision",
          knownRevision,
          incomingRevision,
        }
        return s
      }
      if (incomingRevision === knownRevision) {
        const orderMatches =
          questionSetMatches &&
          s.survey.questions.every(
            (question) => incomingOrders.get(question.id) === question.order
          )
        outcome = {
          status: orderMatches ? "ignored" : "fallback",
          reason: orderMatches ? "duplicate-revision" : "state-mismatch",
          knownRevision,
          incomingRevision,
        }
        return s
      }

      const orderMutation = s.mutationStates[editorMutationKey.order(surveyId)]
      if (
        orderMutation &&
        PROTECTED_MUTATION_STATUSES.has(orderMutation.status)
      ) {
        outcome = {
          status: "fallback",
          reason: "structure-mutation-protected",
          knownRevision,
          incomingRevision,
        }
        return s
      }
      if (s.pendingQuestionIds.size > 0) {
        outcome = {
          status: "fallback",
          reason: "local-structure-pending",
          knownRevision,
          incomingRevision,
        }
        return s
      }
      if (!questionSetMatches) {
        outcome = {
          status: "fallback",
          reason: "state-mismatch",
          knownRevision,
          incomingRevision,
        }
        return s
      }

      const questions = s.survey.questions
        .map(
          (question) =>
            ({
              ...question,
              order: incomingOrders.get(question.id)!,
            }) as Question
        )
        .sort((left, right) => left.order - right.order)

      outcome = {
        status: "applied",
        reason: "newer-revision",
        knownRevision,
        incomingRevision,
      }
      return {
        survey: {
          ...s.survey,
          structureRevision: incomingRevision,
          questions,
        },
        questionBaselines: alignQuestionBaselines(
          s.questionBaselines,
          questions
        ),
      }
    })

    return outcome
  },

  applyRemoteSurveyDetails: (surveyId, incoming) => {
    let outcome: RemoteEditorEventOutcome = {
      status: "fallback",
      reason: "survey-unavailable",
      knownRevision: null,
      incomingRevision: incoming.detailsRevision,
    }

    set((s) => {
      if (!s.survey || s.survey.id !== surveyId) return s
      if (!s.surveyDetailsBaseline) {
        outcome = {
          ...outcome,
          reason: "survey-details-unavailable",
        }
        return s
      }

      const knownRevision = Math.max(
        s.survey.detailsRevision,
        s.surveyDetailsBaseline.detailsRevision
      )
      const incomingRevision = incoming.detailsRevision
      if (incomingRevision < knownRevision) {
        outcome = {
          status: "ignored",
          reason: "stale-revision",
          knownRevision,
          incomingRevision,
        }
        return s
      }
      if (incomingRevision === knownRevision) {
        const contentMatches =
          surveyDetailsEqual(incoming, s.surveyDetailsBaseline) ||
          surveyDetailsEqual(incoming, s.survey)
        outcome = {
          status: contentMatches ? "ignored" : "fallback",
          reason: contentMatches
            ? "duplicate-revision"
            : "revision-content-mismatch",
          knownRevision,
          incomingRevision,
        }
        return s
      }

      const mutationKey = editorMutationKey.surveyDetails(surveyId)
      const mutation = s.mutationStates[mutationKey]
      const mutationProtected = Boolean(
        mutation && PROTECTED_MUTATION_STATUSES.has(mutation.status)
      )
      const hasLocalDraft = !surveyDetailsEqual(
        s.survey,
        s.surveyDetailsBaseline
      )
      if (mutationProtected || hasLocalDraft) {
        outcome = {
          status: "fallback",
          reason: mutationProtected
            ? "mutation-protected"
            : "local-survey-draft",
          knownRevision,
          incomingRevision,
        }

        if (!mutationProtected && hasLocalDraft) {
          return {
            mutationStates: {
              ...s.mutationStates,
              [mutationKey]: {
                status: "conflict",
                message:
                  "问卷信息已被其他协作者更新，请选择保留本地修改或使用服务器版本",
                updatedAt: Date.now(),
              },
            },
          }
        }
        return s
      }

      outcome = {
        status: "applied",
        reason: "newer-revision",
        knownRevision,
        incomingRevision,
      }
      return {
        survey: {
          ...s.survey,
          title: incoming.title,
          description: incoming.description,
          settings: incoming.settings,
          detailsRevision: incomingRevision,
        },
        surveyDetailsBaseline: incoming,
      }
    })

    return outcome
  },

  restoreQuestionBaseline: (id) =>
    set((s) => {
      if (!s.survey || !s.questionBaselines[id]) return s
      const baseline = s.questionBaselines[id]
      return {
        survey: {
          ...s.survey,
          questions: s.survey.questions.map((question) =>
            question.id === id ? baseline : question
          ),
        },
      }
    }),

  setQuestionBaseline: (question) =>
    set((s) => ({
      questionBaselines: {
        ...s.questionBaselines,
        [question.id]: question,
      },
      survey: s.survey
        ? {
            ...s.survey,
            questions: s.survey.questions.map((current) =>
              current.id === question.id
                ? ({ ...current, revision: question.revision } as Question)
                : current
            ),
          }
        : s.survey,
    })),

  commitSurveyMutation: (submitted, persisted) =>
    set((s) => {
      if (!s.survey) return s

      const contentMatches = surveyDetailsEqual(s.survey, submitted)

      return {
        survey: {
          ...s.survey,
          ...(contentMatches
            ? {
                title: persisted.title,
                description: persisted.description,
                settings: persisted.settings,
              }
            : {}),
          detailsRevision: persisted.detailsRevision,
        },
        surveyDetailsBaseline: persisted,
      }
    }),

  setSurveyDetailsBaseline: (details) =>
    set((s) => ({
      survey: s.survey
        ? { ...s.survey, detailsRevision: details.detailsRevision }
        : s.survey,
      surveyDetailsBaseline: details,
    })),

  restoreSurveyDetailsBaseline: () =>
    set((s) => {
      if (!s.survey || !s.surveyDetailsBaseline) return s
      return {
        survey: {
          ...s.survey,
          ...s.surveyDetailsBaseline,
        },
      }
    }),

  setMutationState: (key, status, message) =>
    set((s) => ({
      mutationStates: {
        ...s.mutationStates,
        [key]: { status, message, updatedAt: Date.now() },
      },
    })),

  clearMutationState: (key) =>
    set((s) => {
      const mutationStates = { ...s.mutationStates }
      delete mutationStates[key]
      return { mutationStates }
    }),

  setStructureRevision: (revision) =>
    set((s) =>
      s.survey ? { survey: { ...s.survey, structureRevision: revision } } : s
    ),

  updateSurveySettings: (settings) =>
    set((s) => (s.survey ? { survey: { ...s.survey, settings } } : s)),

  setPublished: (published) =>
    set((s) => (s.survey ? { survey: { ...s.survey, published } } : s)),

  deleteQuestion: (id) =>
    set((s) => {
      if (!s.survey) return s
      const questions = s.survey.questions.filter((q) => q.id !== id)
      const selectedId =
        s.selectedId === id ? (questions[0]?.id ?? null) : s.selectedId
      return {
        survey: { ...s.survey, questions },
        selectedId,
        questionBaselines: Object.fromEntries(
          Object.entries(s.questionBaselines).filter(([key]) => key !== id)
        ),
      }
    }),

  reorderQuestions: (fromIndex, toIndex) =>
    set((s) => {
      if (!s.survey) return s
      const questions = [...s.survey.questions]
      const [removed] = questions.splice(fromIndex, 1)
      questions.splice(toIndex, 0, removed)
      const reorderedQuestions = questions.map((question, order) => ({
        ...question,
        order,
      })) as Question[]
      return {
        survey: { ...s.survey, questions: reorderedQuestions },
      }
    }),

  updateSurveyInfo: (title, description) =>
    set((s) => {
      if (!s.survey) return s
      return {
        survey: { ...s.survey, title, description: description || null },
      }
    }),
}))
