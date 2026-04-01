"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import { ArrowLeft, Save, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { useEditorStore } from "@/lib/editor-store"
import {
  getQuestionDef,
  createQuestion,
  QUESTION_DEFS,
} from "@/lib/questions/registry"
import type { Question, QuestionType } from "@/lib/questions/types"

export default function EditSurveyPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const {
    survey,
    selectedId,
    dirty,
    setSurvey,
    selectQuestion,
    addQuestion,
    updateQuestion,
    deleteQuestion,
    updateSurveyInfo,
    markSaved,
  } = useEditorStore()
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [isEditingDesc, setIsEditingDesc] = useState(false)
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null)

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

  async function handleSaveTitle() {
    if (!survey) return
    const res = await fetch(`/api/surveys/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: survey.title,
        description: survey.description,
      }),
    })
    if (res.ok) {
      markSaved()
      toast.success("已保存")
    } else {
      toast.error("保存失败")
    }
  }

  async function handleAddQuestion(type: QuestionType) {
    if (!survey) return
    const question = createQuestion(type, survey.questions.length)
    const res = await fetch(`/api/surveys/${id}/questions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: question.title,
        type: question.type,
        required: question.required,
        config: question.config,
      }),
    })
    if (res.ok) {
      const created = await res.json()
      addQuestion({ ...question, id: created.id })
    } else {
      toast.error("添加失败")
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
      <div className="flex h-svh items-center justify-center text-muted-foreground">
        加载中...
      </div>
    )
  }

  const selectedQuestion =
    survey.questions.find((q) => q.id === selectedId) ?? null

  return (
    <div className="flex h-svh flex-col overflow-hidden">
      {/* 顶部栏 */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b bg-background px-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/surveys")}
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            返回
          </Button>
          <div className="h-4 w-px bg-border" />
          <input
            className="w-64 border-none bg-transparent text-base font-semibold outline-none placeholder:text-muted-foreground"
            value={survey.title}
            onChange={(e) =>
              updateSurveyInfo(e.target.value, survey.description ?? "")
            }
            placeholder="未命名问卷"
          />
          {dirty && (
            <span className="text-xs text-muted-foreground">未保存</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "text-xs font-medium",
              survey.published ? "text-green-600" : "text-muted-foreground"
            )}
          >
            {survey.published ? "已发布" : "草稿"}
          </span>
          <Button size="sm" onClick={handleSaveTitle} disabled={!dirty}>
            <Save className="mr-1 h-3.5 w-3.5" />
            保存
          </Button>
        </div>
      </header>

      {/* 主体区域 */}
      <div className="relative flex-1 overflow-hidden">
        {/* 左栏：题型面板（悬浮） */}
        <aside className="absolute top-4 left-4 z-10 flex h-[calc(100%-2rem)] w-80 flex-col rounded-xl border bg-background shadow-xl">
          <div className="border-b px-4 py-3 text-xs font-medium text-muted-foreground">
            添加题目
          </div>
          <div className="flex-1 space-y-1 overflow-y-auto p-2">
            {QUESTION_DEFS.map(
              ({ type, label, icon: Icon, defaultQuestion }) => (
                <button
                  key={type}
                  onClick={() => handleAddQuestion(type as QuestionType)}
                  className="flex w-full items-start gap-3 rounded-lg p-3 text-left transition-colors hover:bg-muted"
                >
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium">{label}</div>
                    <div className="text-xs text-muted-foreground">
                      {defaultQuestion(0).type === "SINGLE_CHOICE" &&
                        "从多个选项中选一个"}
                      {defaultQuestion(0).type === "MULTIPLE_CHOICE" &&
                        "可选择多个答案"}
                      {defaultQuestion(0).type === "TEXT" && "自由文本输入"}
                      {defaultQuestion(0).type === "RATING" && "1-N 分评分"}
                    </div>
                  </div>
                </button>
              )
            )}
          </div>
        </aside>

        {/* 中间：问卷画布 */}
        <div className="h-full overflow-y-auto px-[calc(20rem+2.5rem)] py-6">
          <div className="mx-auto max-w-[1000px]">
            {/* 问卷纸张 */}
            <div className="rounded-sm bg-background shadow-[0_4px_24px_rgba(0,0,0,0.10)] ring-1 ring-border">
              {/* 顶部色条 */}
              <div className="h-2 rounded-t-sm bg-primary" />

              {/* 标题区 */}
              <div className="border-b border-dashed border-border p-5">
                {isEditingTitle ? (
                  <Input
                    autoFocus
                    className="h-auto rounded-sm border-2 border-primary bg-transparent px-3 py-2 text-xl font-bold tracking-tight shadow-none focus-visible:ring-0"
                    style={{ fontSize: "1.25rem", lineHeight: "1.75rem" }}
                    value={survey.title}
                    onChange={(e) =>
                      updateSurveyInfo(e.target.value, survey.description ?? "")
                    }
                    onBlur={() => setIsEditingTitle(false)}
                  />
                ) : (
                  <div
                    onClick={() => setIsEditingTitle(true)}
                    className="group relative cursor-text rounded-sm border-2 border-transparent px-3 py-2 hover:border-dashed hover:border-border"
                  >
                    <div className="text-xl leading-7 font-bold tracking-tight">
                      {survey.title || "未命名问卷"}
                    </div>
                  </div>
                )}

                <div className="mt-2">
                  {isEditingDesc ? (
                    <Textarea
                      autoFocus
                      className="min-h-[80px] rounded-sm border-2 border-primary bg-transparent px-3 py-2 text-sm text-muted-foreground shadow-none focus-visible:ring-0"
                      placeholder="添加问卷说明..."
                      value={survey.description ?? ""}
                      onChange={(e) =>
                        updateSurveyInfo(survey.title, e.target.value)
                      }
                      onBlur={() => setIsEditingDesc(false)}
                    />
                  ) : (
                    <div
                      onClick={() => setIsEditingDesc(true)}
                      className="group relative cursor-text rounded-sm border-2 border-transparent px-3 py-2 hover:border-dashed hover:border-border"
                    >
                      <div className="text-sm text-muted-foreground">
                        {survey.description || "添加问卷说明..."}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 题目列表 */}
              <div className="divide-y divide-dashed divide-border">
                {survey.questions.length === 0 ? (
                  <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
                    点击左侧题型添加第一道题
                  </div>
                ) : (
                  survey.questions.map((q, idx) => {
                    const def = getQuestionDef(q.type)
                    return (
                      <button
                        key={q.id}
                        onClick={() => selectQuestion(q.id)}
                        className={cn(
                          "relative w-full p-2 text-left transition-colors",
                          selectedId === q.id
                            ? "bg-primary/5"
                            : "hover:bg-muted/5"
                        )}
                      >
                        {selectedId === q.id && (
                          <div className="absolute top-0 left-0 h-full w-1 rounded-l-sm bg-primary" />
                        )}
                        <div
                          className={cn(
                            "rounded-sm border-2 border-transparent px-3 py-3 transition-colors",
                            selectedId === q.id
                              ? "border-dashed border-primary/30"
                              : "hover:border-dashed hover:border-border"
                          )}
                        >
                          <div className="relative flex items-start justify-between gap-2">
                              <div className="flex items-start">
                                <span className="mr-2 mt-2 text-xs text-muted-foreground">
                                  {idx + 1}.
                                </span>
                                <div className="flex-1">
                                  {editingQuestionId === q.id ? (
                                    <Input
                                      autoFocus
                                      className="h-auto rounded-sm border-2 border-primary bg-transparent px-2 py-1 text-sm font-medium shadow-none focus-visible:ring-0"
                                      value={q.title}
                                      onChange={(e) =>
                                        updateQuestion({
                                          ...q,
                                          title: e.target.value,
                                        })
                                      }
                                      onBlur={() => {
                                        setEditingQuestionId(null)
                                        // 触发异步保存
                                        fetch(
                                          `/api/surveys/${id}/questions/${q.id}`,
                                          {
                                            method: "PUT",
                                            headers: {
                                              "Content-Type": "application/json",
                                            },
                                            body: JSON.stringify({
                                              title: q.title,
                                              required: q.required,
                                              config: q.config,
                                            }),
                                          }
                                        )
                                      }}
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                  ) : (
                                    <div
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        selectQuestion(q.id)
                                        setEditingQuestionId(q.id)
                                      }}
                                      className="group/title relative cursor-text rounded-sm border-2 border-transparent px-2 py-1 hover:border-dashed hover:border-border"
                                    >
                                      <span className="text-sm font-medium">
                                        {q.title}
                                      </span>
                                      {q.required && (
                                        <span className="ml-1 text-xs text-red-500">
                                          *
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                              {def.label}
                            </span>
                          </div>
                          <div className="relative mt-3 pl-8">
                            <def.Canvas
                              question={q as never}
                              selected={selectedId === q.id}
                              onUpdate={(updated) =>
                                updateQuestion(updated as Question)
                              }
                            />
                          </div>
                        </div>
                      </button>
                    )
                  })
                )}
              </div>

              {/* 底部留白 */}
              <div className="h-8" />
            </div>
          </div>
        </div>

        {/* 右栏：属性编辑（悬浮） */}
        <aside className="absolute top-4 right-4 z-10 flex h-[calc(100%-2rem)] w-80 flex-col rounded-xl border bg-background shadow-xl">
          {selectedQuestion ? (
            <QuestionEditor
              key={selectedQuestion.id}
              surveyId={id}
              question={selectedQuestion}
              onUpdate={updateQuestion}
              onDelete={() => handleDeleteQuestion(selectedQuestion.id)}
            />
          ) : (
            <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
              选中题目后可编辑属性
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}

function QuestionEditor({
  surveyId,
  question,
  onUpdate,
  onDelete,
}: {
  surveyId: string
  question: Question
  onUpdate: (q: Question) => void
  onDelete: () => void
}) {
  const def = getQuestionDef(question.type)

  async function handleChange(updated: Question) {
    onUpdate(updated)
    await fetch(`/api/surveys/${surveyId}/questions/${question.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: updated.title,
        required: updated.required,
        config: updated.config,
      }),
    })
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <span className="text-sm font-medium">题目属性</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive hover:text-destructive"
          onClick={onDelete}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto p-4">
        {/* 题目类型 */}
        <div>
          <Label className="text-xs text-muted-foreground">题目类型</Label>
          <div className="mt-1 rounded-md border bg-muted px-3 py-2 text-sm">
            {def.label}
          </div>
        </div>

        {/* 题目内容 */}
        <div>
          <Label className="text-xs text-muted-foreground">题目内容</Label>
          <textarea
            className="mt-1 w-full resize-none rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
            rows={3}
            value={question.title}
            onChange={(e) =>
              handleChange({ ...question, title: e.target.value })
            }
          />
        </div>

        {/* 必填开关 */}
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">必填</Label>
          <button
            role="switch"
            aria-checked={question.required}
            onClick={() =>
              handleChange({ ...question, required: !question.required })
            }
            className={cn(
              "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
              question.required ? "bg-primary" : "bg-input"
            )}
          >
            <span
              className={cn(
                "pointer-events-none inline-block h-4 w-4 rounded-full bg-background shadow-lg transition-transform",
                question.required ? "translate-x-4" : "translate-x-0"
              )}
            />
          </button>
        </div>

        {/* 题型专属编辑器 */}
        <def.Editor
          question={question as never}
          onChange={(updated) => handleChange(updated as Question)}
        />
      </div>
    </div>
  )
}
