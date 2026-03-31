"use client"

import { useEffect } from "react"
import { useParams } from "next/navigation"
import { toast } from "sonner"
import { EditorHeader } from "@/components/editor/editor-header"
import { SidebarPalette } from "@/components/editor/sidebar-palette"
import { useEditorStore } from "@/lib/editor-store"
import { getQuestionDef } from "@/lib/questions/registry"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Trash2 } from "lucide-react"
import type { Question } from "@/lib/questions/types"

export default function EditSurveyPage() {
  const { id } = useParams<{ id: string }>()
  const {
    survey,
    selectedId,
    setSurvey,
    selectQuestion,
    updateQuestion,
    deleteQuestion,
  } = useEditorStore()

  useEffect(() => {
    fetch(`/api/surveys/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setSurvey({
          id: data.id,
          title: data.title,
          description: data.description,
          published: data.published,
          questions: (data.questions ?? []).map(
            (q: Record<string, unknown>) => ({
              id: q.id,
              type: q.type,
              title: q.title,
              required: q.required,
              order: q.order,
              config: q.config ?? {},
            })
          ) as Question[],
        })
      })
  }, [id, setSurvey])

  async function handleUpdateQuestion(question: Question) {
    updateQuestion(question)
    const res = await fetch(`/api/surveys/${id}/questions/${question.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: question.title,
        type: question.type,
        required: question.required,
        config: question.config,
        order: question.order,
      }),
    })
    if (!res.ok) {
      toast.error("更新题目失败")
    }
  }

  async function handleDeleteQuestion(qid: string) {
    const res = await fetch(`/api/surveys/${id}/questions/${qid}`, {
      method: "DELETE",
    })
    if (res.ok) {
      deleteQuestion(qid)
    } else {
      toast.error("删除失败")
    }
  }

  if (!survey) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        加载中...
      </div>
    )
  }

  const selectedQuestion =
    survey.questions.find((q) => q.id === selectedId) ?? null

  return (
    <div className="flex h-full flex-col">
      <EditorHeader surveyId={id} />

      <div className="flex flex-1 overflow-hidden">
        {/* 左侧：题目列表 */}
        <aside className="flex w-64 shrink-0 flex-col gap-2 overflow-y-auto border-r p-3">
          {survey.questions.map((q, idx) => {
            const def = getQuestionDef(q.type)
            return (
              <button
                key={q.id}
                onClick={() => selectQuestion(q.id)}
                className={cn(
                  "relative w-full rounded-lg border p-3 text-left transition-colors hover:bg-muted",
                  selectedId === q.id && "border-primary bg-primary/5"
                )}
              >
                {selectedId === q.id && (
                  <div className="absolute top-0 left-0 h-full w-1 rounded-l-lg bg-primary" />
                )}
                <div className="flex items-start justify-between gap-1">
                  <span className="text-xs text-muted-foreground">
                    {idx + 1}.
                  </span>
                  <span className="flex-1 truncate text-sm font-medium">
                    {q.title}
                  </span>
                  <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                    {def.label}
                  </span>
                </div>
                <div className="mt-1.5 pl-5">
                  <def.Canvas
                    question={q as never}
                    selected={selectedId === q.id}
                  />
                </div>
              </button>
            )
          })}
          {survey.questions.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              从右侧添加题目
            </p>
          )}
        </aside>

        {/* 中间：画布 */}
        <main className="flex flex-1 flex-col items-center overflow-y-auto bg-muted/30 p-6">
          {selectedQuestion ? (
            <div className="w-full max-w-2xl rounded-xl border bg-background p-6 shadow-sm">
              <Input
                value={selectedQuestion.title}
                onChange={(e) =>
                  handleUpdateQuestion({
                    ...selectedQuestion,
                    title: e.target.value,
                  })
                }
                className="mb-4 border-none bg-transparent text-lg font-semibold shadow-none focus-visible:ring-0"
                placeholder="题目标题"
              />
              <div className="pl-1">
                {(() => {
                  const def = getQuestionDef(selectedQuestion.type)
                  return (
                    <def.Canvas question={selectedQuestion as never} selected />
                  )
                })()}
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              选择一道题目开始编辑
            </div>
          )}
        </main>

        {/* 右侧：属性面板 + 题型选择 */}
        <div className="flex w-72 shrink-0 flex-col border-l">
          {selectedQuestion ? (
            <div className="flex flex-1 flex-col overflow-y-auto">
              <div className="border-b px-4 py-3 text-xs font-medium text-muted-foreground">
                题目属性
              </div>
              <div className="flex-1 space-y-4 p-4">
                {(() => {
                  const def = getQuestionDef(selectedQuestion.type)
                  return (
                    <def.Editor
                      question={selectedQuestion as never}
                      onChange={(q) => handleUpdateQuestion(q as Question)}
                    />
                  )
                })()}
                <div className="flex items-center justify-between">
                  <Label className="text-sm">必填</Label>
                  <Switch
                    checked={selectedQuestion.required}
                    onCheckedChange={(checked) =>
                      handleUpdateQuestion({
                        ...selectedQuestion,
                        required: checked,
                      })
                    }
                  />
                </div>
              </div>
              <div className="border-t p-4">
                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full"
                  onClick={() => handleDeleteQuestion(selectedQuestion.id)}
                >
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                  删除题目
                </Button>
              </div>
            </div>
          ) : (
            <SidebarPalette surveyId={id} />
          )}
        </div>
      </div>
    </div>
  )
}
