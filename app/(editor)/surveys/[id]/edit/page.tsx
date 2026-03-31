"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  AlignLeft,
  ArrowLeft,
  CheckSquare,
  CircleDot,
  Save,
  Star,
  Trash2,
  PlusCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

type QuestionType = "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "TEXT" | "RATING"

type Question = {
  id: string
  text: string
  type: QuestionType
  order: number
  required: boolean
  options: string[] | null
}

type Survey = {
  id: string
  title: string
  description: string | null
  published: boolean
  questions: Question[]
}

const QUESTION_TYPES: {
  type: QuestionType
  label: string
  icon: React.ElementType
  description: string
}[] = [
  {
    type: "SINGLE_CHOICE",
    label: "单选题",
    icon: CircleDot,
    description: "从多个选项中选一个",
  },
  {
    type: "MULTIPLE_CHOICE",
    label: "多选题",
    icon: CheckSquare,
    description: "可选择多个答案",
  },
  {
    type: "TEXT",
    label: "文本填空",
    icon: AlignLeft,
    description: "自由文本输入",
  },
  { type: "RATING", label: "评分题", icon: Star, description: "1-5 分评分" },
]

export default function EditSurveyPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [survey, setSurvey] = useState<Survey | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [titleDirty, setTitleDirty] = useState(false)

  useEffect(() => {
    fetch(`/api/surveys/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setSurvey(data)
        setTitle(data.title)
        setDescription(data.description || "")
        setLoading(false)
        if (data.questions.length > 0) setSelectedId(data.questions[0].id)
      })
  }, [id])

  const selectedQuestion =
    survey?.questions.find((q) => q.id === selectedId) ?? null

  async function handleSaveTitle() {
    if (!titleDirty) return
    setSaving(true)
    const res = await fetch(`/api/surveys/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description: description || undefined }),
    })
    if (res.ok) {
      toast.success("已保存")
      setTitleDirty(false)
    } else toast.error("保存失败")
    setSaving(false)
  }

  async function handleAddQuestion(type: QuestionType) {
    const res = await fetch(`/api/surveys/${id}/questions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: "新问题",
        type,
        required: false,
        options:
          type === "SINGLE_CHOICE" || type === "MULTIPLE_CHOICE"
            ? ["选项1", "选项2"]
            : undefined,
      }),
    })
    if (res.ok) {
      const q = await res.json()
      setSurvey((prev) =>
        prev ? { ...prev, questions: [...prev.questions, q] } : prev
      )
      setSelectedId(q.id)
    } else {
      toast.error("添加失败")
    }
  }

  async function handleDeleteQuestion(qid: string) {
    const res = await fetch(`/api/surveys/${id}/questions/${qid}`, {
      method: "DELETE",
    })
    if (res.ok) {
      setSurvey((prev) => {
        if (!prev) return prev
        const remaining = prev.questions.filter((q) => q.id !== qid)
        setSelectedId(remaining.length > 0 ? remaining[0].id : null)
        return { ...prev, questions: remaining }
      })
    } else {
      toast.error("删除失败")
    }
  }

  const handleQuestionUpdate = useCallback((updated: Question) => {
    setSurvey((prev) =>
      prev
        ? {
            ...prev,
            questions: prev.questions.map((q) =>
              q.id === updated.id ? updated : q
            ),
          }
        : prev
    )
  }, [])

  if (loading)
    return (
      <div className="flex min-h-svh items-center justify-center">
        加载中...
      </div>
    )
  if (!survey)
    return (
      <div className="flex min-h-svh items-center justify-center">
        问卷不存在
      </div>
    )

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
            value={title}
            onChange={(e) => {
              setTitle(e.target.value)
              setTitleDirty(true)
            }}
            onBlur={handleSaveTitle}
            placeholder="问卷标题"
          />
        </div>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "text-xs",
              survey.published ? "text-green-600" : "text-muted-foreground"
            )}
          >
            {survey.published ? "已发布" : "草稿"}
          </span>
          <Button
            size="sm"
            onClick={handleSaveTitle}
            disabled={saving || !titleDirty}
          >
            <Save className="mr-1 h-4 w-4" />
            保存
          </Button>
        </div>
      </header>

      {/* 三栏主体 */}
      <div className="relative flex flex-1 overflow-hidden">
        {/* 左栏：题型列表 */}
        <aside className="absolute top-4 left-4 z-10 flex h-[calc(100%-2rem)] w-64 flex-col rounded-xl border bg-background shadow-xl">
          <div className="border-b px-3 py-2 text-xs font-medium text-muted-foreground">
            添加题目
          </div>
          <div className="flex-1 space-y-1 overflow-y-auto p-2">
            {QUESTION_TYPES.map(({ type, label, icon: Icon, description }) => (
              <button
                key={type}
                onClick={() => handleAddQuestion(type)}
                className="flex w-full items-start gap-2 rounded-md p-2 text-left text-sm transition-colors hover:bg-muted"
              >
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div>
                  <div className="font-medium">{label}</div>
                  <div className="text-xs text-muted-foreground">
                    {description}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </aside>

        {/* 中栏：问卷主体 */}
        <div className="flex flex-1 flex-col overflow-hidden bg-muted/50 dark:bg-muted/20">
          <div className="flex-1 overflow-y-auto px-72 py-10">
            <div className="mx-auto max-w-2xl">
              {/* 问卷纸张 */}
              <div className="rounded-sm bg-background shadow-[0_4px_24px_rgba(0,0,0,0.10)] ring-1 ring-border">
                {/* 顶部色条 */}
                <div className="h-2 rounded-t-sm bg-primary" />

                {/* 标题区 */}
                <div className="border-b border-dashed border-border px-8 py-6">
                  <div className="text-xl font-bold tracking-tight">
                    {title || "未命名问卷"}
                  </div>
                  {description && (
                    <div className="mt-1.5 text-sm text-muted-foreground">
                      {description}
                    </div>
                  )}
                </div>

                {/* 题目列表 */}
                <div className="divide-y divide-dashed divide-border">
                  {survey.questions.length === 0 ? (
                    <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
                      点击左侧题型添加第一道题
                    </div>
                  ) : (
                    survey.questions.map((q, idx) => (
                      <button
                        key={q.id}
                        onClick={() => setSelectedId(q.id)}
                        className={cn(
                          "relative w-full px-8 py-5 text-left transition-colors",
                          selectedId === q.id
                            ? "bg-primary/5"
                            : "hover:bg-muted/50"
                        )}
                      >
                        {selectedId === q.id && (
                          <div className="absolute top-0 left-0 h-full w-1 rounded-l-sm bg-primary" />
                        )}
                        <div className="relative flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <span className="mr-2 text-xs text-muted-foreground">
                              {idx + 1}.
                            </span>
                            <span className="text-sm font-medium">
                              {q.text}
                            </span>
                            {q.required && (
                              <span className="ml-1 text-xs text-red-500">
                                *
                              </span>
                            )}
                          </div>
                          <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                            {
                              QUESTION_TYPES.find((t) => t.type === q.type)
                                ?.label
                            }
                          </span>
                        </div>
                        {(q.type === "SINGLE_CHOICE" ||
                          q.type === "MULTIPLE_CHOICE") &&
                          q.options && (
                            <div className="mt-2.5 space-y-1.5 pl-5">
                              {q.options.map((opt, i) => (
                                <div
                                  key={i}
                                  className="flex items-center gap-2 text-xs text-muted-foreground"
                                >
                                  <div
                                    className={cn(
                                      "h-3 w-3 shrink-0 border border-border",
                                      q.type === "SINGLE_CHOICE"
                                        ? "rounded-full"
                                        : "rounded-sm"
                                    )}
                                  />
                                  {opt}
                                </div>
                              ))}
                            </div>
                          )}
                        {q.type === "RATING" && (
                          <div className="mt-2.5 flex gap-1 pl-5">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                className="h-4 w-4 text-muted-foreground"
                              />
                            ))}
                          </div>
                        )}
                        {q.type === "TEXT" && (
                          <div className="mt-2.5 ml-5 h-7 border-b border-border" />
                        )}
                      </button>
                    ))
                  )}
                </div>

                {/* 底部留白 */}
                <div className="h-8" />
              </div>
            </div>
          </div>
        </div>

        {/* 右栏：属性编辑 */}
        <aside className="absolute top-4 right-4 z-10 flex h-[calc(100%-2rem)] w-80 flex-col rounded-xl border bg-background shadow-xl">
          {selectedQuestion ? (
            <QuestionEditor
              key={selectedQuestion.id}
              surveyId={id}
              question={selectedQuestion}
              onUpdate={handleQuestionUpdate}
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
  const [text, setText] = useState(question.text)
  const [required, setRequired] = useState(question.required)
  const [options, setOptions] = useState<string[]>(question.options ?? [])
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)

  function markDirty() {
    setDirty(true)
  }

  async function handleSave() {
    setSaving(true)
    const res = await fetch(
      `/api/surveys/${surveyId}/questions/${question.id}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          required,
          options:
            question.type === "SINGLE_CHOICE" ||
            question.type === "MULTIPLE_CHOICE"
              ? options
              : undefined,
        }),
      }
    )
    if (res.ok) {
      const updated = await res.json()
      onUpdate(updated)
      toast.success("已保存")
      setDirty(false)
    } else {
      toast.error("保存失败")
    }
    setSaving(false)
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <span className="text-sm font-medium">题目属性</span>
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive"
          onClick={onDelete}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto p-4">
        {/* 题目类型（只读） */}
        <div>
          <Label className="text-xs text-muted-foreground">题目类型</Label>
          <div className="mt-1 rounded-md border bg-muted px-3 py-2 text-sm">
            {QUESTION_TYPES.find((t) => t.type === question.type)?.label}
          </div>
        </div>

        {/* 题目文本 */}
        <div>
          <Label className="text-xs text-muted-foreground">题目内容</Label>
          <textarea
            className="mt-1 w-full resize-none rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
            rows={3}
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              markDirty()
            }}
          />
        </div>

        {/* 必填 */}
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">必填</Label>
          <button
            role="switch"
            aria-checked={required}
            onClick={() => {
              setRequired(!required)
              markDirty()
            }}
            className={cn(
              "relative h-5 w-9 rounded-full transition-colors",
              required ? "bg-primary" : "bg-muted-foreground/30"
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 h-4 w-4 rounded-full bg-background shadow transition-transform",
                required ? "translate-x-4" : "translate-x-0.5"
              )}
            />
          </button>
        </div>

        {/* 选项 */}
        {(question.type === "SINGLE_CHOICE" ||
          question.type === "MULTIPLE_CHOICE") && (
          <div>
            <Label className="text-xs text-muted-foreground">选项</Label>
            <div className="mt-2 space-y-2">
              {options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    value={opt}
                    onChange={(e) => {
                      const next = [...options]
                      next[i] = e.target.value
                      setOptions(next)
                      markDirty()
                    }}
                    className="h-8 text-sm"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-muted-foreground"
                    onClick={() => {
                      setOptions(options.filter((_, j) => j !== i))
                      markDirty()
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => {
                  setOptions([...options, `选项${options.length + 1}`])
                  markDirty()
                }}
              >
                <PlusCircle className="mr-1 h-3 w-3" />
                添加选项
              </Button>
            </div>
          </div>
        )}

        {question.type === "RATING" && (
          <div>
            <Label className="text-xs text-muted-foreground">评分说明</Label>
            <p className="mt-1 text-sm text-muted-foreground">
              1 - 5 分，由受访者选择
            </p>
          </div>
        )}

        {question.type === "TEXT" && (
          <div>
            <Label className="text-xs text-muted-foreground">说明</Label>
            <p className="mt-1 text-sm text-muted-foreground">
              受访者将看到一个文本输入框
            </p>
          </div>
        )}
      </div>

      <div className="border-t p-4">
        <Button
          className="w-full"
          onClick={handleSave}
          disabled={saving || !dirty}
        >
          {saving ? "保存中..." : "保存修改"}
        </Button>
      </div>
    </div>
  )
}
