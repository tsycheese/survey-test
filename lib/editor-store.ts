import { create } from "zustand"
import type { Question, Survey } from "@/lib/questions/types"

type EditorStore = {
  survey: Survey | null
  selectedId: string | null
  dirty: boolean

  setSurvey: (survey: Survey) => void
  selectQuestion: (id: string | null) => void
  addQuestion: (question: Question) => void
  updateQuestion: (question: Question) => void
  deleteQuestion: (id: string) => void
  reorderQuestions: (fromIndex: number, toIndex: number) => void
  updateSurveyInfo: (title: string, description: string) => void
  markSaved: () => void
}

export const useEditorStore = create<EditorStore>((set) => ({
  survey: null,
  selectedId: null,
  dirty: false,

  setSurvey: (survey) => set({ survey, selectedId: null, dirty: false }),

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
