import { create } from "zustand"
import type { Question, Survey } from "@/lib/questions/types"

type EditorStore = {
  survey: Survey | null
  selectedId: string | null
  pendingQuestionIds: Set<string>
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
  deleteQuestion: (id: string) => void
  reorderQuestions: (fromIndex: number, toIndex: number) => void
  updateSurveyInfo: (title: string, description: string) => void
  markSaved: () => void
}

export const useEditorStore = create<EditorStore>((set) => ({
  survey: null,
  selectedId: null,
  pendingQuestionIds: new Set(),
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
        dirty: false,
      }
    }),

  reconcileSurvey: (survey) =>
    set((s) => {
      if (!s.survey || s.survey.id !== survey.id) return s

      const pendingQuestions = s.survey.questions.filter((question) =>
        s.pendingQuestionIds.has(question.id)
      )
      const questions = [...survey.questions]

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
        survey: { ...survey, questions: normalizedQuestions },
        selectedId,
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

  deleteQuestion: (id) =>
    set((s) => {
      if (!s.survey) return s
      const questions = s.survey.questions.filter((q) => q.id !== id)
      const selectedId =
        s.selectedId === id ? (questions[0]?.id ?? null) : s.selectedId
      return {
        survey: { ...s.survey, questions },
        selectedId,
        dirty: true,
      }
    }),

  reorderQuestions: (fromIndex, toIndex) =>
    set((s) => {
      if (!s.survey) return s
      const questions = [...s.survey.questions]
      const [removed] = questions.splice(fromIndex, 1)
      questions.splice(toIndex, 0, removed)
      // 更新所有题目的 order
      questions.forEach((q, idx) => {
        q.order = idx
      })
      return {
        survey: { ...s.survey, questions },
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
