import { create } from "zustand"
import type { Question, Survey } from "@/lib/questions/types"
import type {
  EditorMutationState,
  EditorMutationStatus,
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
  left: Pick<Survey, "title" | "description" | "settings">,
  right: Pick<Survey, "title" | "description" | "settings">
): boolean {
  return (
    left.title === right.title &&
    left.description === right.description &&
    JSON.stringify(left.settings) === JSON.stringify(right.settings)
  )
}

type EditorStore = {
  survey: Survey | null
  selectedId: string | null
  pendingQuestionIds: Set<string>
  questionBaselines: Record<string, Question>
  mutationStates: Record<string, EditorMutationState>
  dirty: boolean

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
  restoreQuestionBaseline: (id: string) => void
  setQuestionBaseline: (question: Question) => void
  commitSurveyMutation: (
    submitted: Pick<Survey, "title" | "description" | "settings">,
    persisted: Pick<Survey, "title" | "description" | "settings">
  ) => void
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
  markSaved: () => void
}

export const useEditorStore = create<EditorStore>((set) => ({
  survey: null,
  selectedId: null,
  pendingQuestionIds: new Set(),
  questionBaselines: {},
  mutationStates: {},
  dirty: false,

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
        mutationStates: {},
        dirty: false,
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
      }
    }),

  selectQuestion: (id) => set({ selectedId: id }),

  addQuestion: (question) =>
    set((s) => {
      if (!s.survey) return s
      return {
        survey: { ...s.survey, questions: [...s.survey.questions, question] },
        selectedId: question.id,
        dirty: true,
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
        dirty: true,
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
        dirty: true,
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
        dirty: true,
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
        dirty: true,
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
      if (!s.survey || !surveyDetailsEqual(s.survey, submitted)) return s

      return {
        survey: {
          ...s.survey,
          title: persisted.title,
          description: persisted.description,
          settings: persisted.settings,
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
    set((s) =>
      s.survey ? { survey: { ...s.survey, settings }, dirty: true } : s
    ),

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
        dirty: true,
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
        dirty: true,
      }
    }),

  updateSurveyInfo: (title, description) =>
    set((s) => {
      if (!s.survey) return s
      return {
        survey: { ...s.survey, title, description: description || null },
        dirty: true,
      }
    }),

  markSaved: () => set({ dirty: false }),
}))
