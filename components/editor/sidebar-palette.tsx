"use client"

import { useEditorStore } from "@/lib/editor-store"
import { QUESTION_DEFS } from "@/lib/questions/registry"
import { createQuestion } from "@/lib/questions/registry"
import type { QuestionType } from "@/lib/questions/types"
import { toast } from "sonner"

export function SidebarPalette({ surveyId }: { surveyId: string }) {
  const { survey, addQuestion } = useEditorStore()

  async function handleAdd(type: QuestionType) {
    if (!survey) return
    const order = survey.questions.length
    const question = createQuestion(type, order)

    const res = await fetch(`/api/surveys/${surveyId}/questions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(question),
    })
    if (!res.ok) {
      toast.error("添加题目失败")
      return
    }
    const saved = await res.json()
    addQuestion({ ...question, id: saved.id })
  }

  return (
    <aside className="absolute left-4 top-4 z-10 flex h-[calc(100%-2rem)] w-64 flex-col rounded-xl border bg-background shadow-xl">
      <div className="border-b px-4 py-3 text-xs font-medium text-muted-foreground">
        添加题目
      </div>
      <div className="flex-1 space-y-1 overflow-y-auto p-2">
        {QUESTION_DEFS.map(({ type, label, icon: Icon, defaultQuestion }) => (
          <button
            key={type}
            onClick={() => handleAdd(type as QuestionType)}
            className="flex w-full items-start gap-3 rounded-lg p-3 text-left transition-colors hover:bg-muted"
          >
            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div>
              <div className="text-sm font-medium">{label}</div>
              <div className="text-xs text-muted-foreground">
                {defaultQuestion(0).type === "SINGLE_CHOICE" && "从多个选项中选一个"}
                {defaultQuestion(0).type === "MULTIPLE_CHOICE" && "可选择多个答案"}
                {defaultQuestion(0).type === "TEXT" && "自由文本输入"}
                {defaultQuestion(0).type === "RATING" && "1-N 分评分"}
              </div>
            </div>
          </button>
        ))}
      </div>
    </aside>
  )
}
