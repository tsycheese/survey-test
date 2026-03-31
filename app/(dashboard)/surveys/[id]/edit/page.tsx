"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import { PlusCircle, Trash2, GripVertical, ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

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

const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  SINGLE_CHOICE: "单选题",
  MULTIPLE_CHOICE: "多选题",
  TEXT: "文本填空",
  RATING: "评分题",
}

export default function EditSurveyPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [survey, setSurvey] = useState<Survey | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")

  useEffect(() => {
    fetch(`/api/surveys/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setSurvey(data)
        setTitle(data.title)
        setDescription(data.description || "")
        setLoading(false)
      })
  }, [id])

  async function handleSaveInfo() {
    setSaving(true)
    const res = await fetch(`/api/surveys/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description: description || undefined }),
    })
    if (res.ok) {
      toast.success("已保存")
    } else {
      toast.error("保存失败")
    }
    setSaving(false)
  }

  async function handleAddQuestion() {
    const res = await fetch(`/api/surveys/${id}/questions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: "新问题",
        type: "SINGLE_CHOICE",
        required: false,
        options: ["选项1", "选项2"],
      }),
    })
    if (res.ok) {
      const q = await res.json()
      setSurvey((prev) =>
        prev ? { ...prev, questions: [...prev.questions, q] } : prev
      )
    } else {
      toast.error("添加失败")
    }
  }

  async function handleDeleteQuestion(qid: string) {
    const res = await fetch(`/api/surveys/${id}/questions/${qid}`, {
      method: "DELETE",
    })
    if (res.ok) {
      setSurvey((prev) =>
        prev
          ? { ...prev, questions: prev.questions.filter((q) => q.id !== qid) }
          : prev
      )
    } else {
      toast.error("删除失败")
    }
  }

  async function handleUpdateQuestion(qid: string, data: Partial<Question>) {
    const res = await fetch(`/api/surveys/${id}/questions/${qid}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      const updated = await res.json()
      setSurvey((prev) =>
        prev
          ? {
              ...prev,
              questions: prev.questions.map((q) =>
                q.id === qid ? updated : q
              ),
            }
          : prev
      )
    } else {
      toast.error("更新失败")
    }
  }

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
    <div className="min-h-svh p-6">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/surveys")}
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            返回
          </Button>
          <h1 className="text-xl font-bold">编辑问卷</h1>
        </div>

        {/* 基本信息 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">基本信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>标题</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>描述</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="（可选）"
              />
            </div>
            <Button size="sm" onClick={handleSaveInfo} disabled={saving}>
              {saving ? "保存中..." : "保存"}
            </Button>
          </CardContent>
        </Card>

        {/* 题目列表 */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">题目（{survey.questions.length}）</h2>
            <Button size="sm" onClick={handleAddQuestion}>
              <PlusCircle className="mr-1 h-4 w-4" />
              添加题目
            </Button>
          </div>

          {survey.questions.length === 0 && (
            <p className="text-sm text-muted-foreground">
              还没有题目，点击「添加题目」开始
            </p>
          )}

          {survey.questions.map((q, index) => (
            <QuestionEditor
              key={q.id}
              question={q}
              index={index}
              onUpdate={(data) => handleUpdateQuestion(q.id, data)}
              onDelete={() => handleDeleteQuestion(q.id)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function QuestionEditor({
  question,
  index,
  onUpdate,
  onDelete,
}: {
  question: Question
  index: number
  onUpdate: (data: Partial<Question>) => void
  onDelete: () => void
}) {
  const [text, setText] = useState(question.text)
  const [type, setType] = useState<QuestionType>(question.type)
  const [required, setRequired] = useState(question.required)
  const [options, setOptions] = useState<string[]>(question.options || [])
  const [dirty, setDirty] = useState(false)

  function markDirty() {
    setDirty(true)
  }

  function handleSave() {
    const data: Partial<Question> = { text, type, required }
    if (type === "SINGLE_CHOICE" || type === "MULTIPLE_CHOICE") {
      data.options = options.filter((o) => o.trim() !== "")
    } else {
      data.options = null
    }
    onUpdate(data)
    setDirty(false)
  }

  function handleTypeChange(newType: QuestionType) {
    setType(newType)
    if (
      (newType === "SINGLE_CHOICE" || newType === "MULTIPLE_CHOICE") &&
      options.length === 0
    ) {
      setOptions(["选项1", "选项2"])
    }
    markDirty()
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">
            第 {index + 1} 题
          </span>
          <div className="ml-auto flex gap-2">
            {dirty && (
              <Button size="sm" onClick={handleSave}>
                保存
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={onDelete}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <Label className="text-xs">题目内容</Label>
          <Input
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              markDirty()
            }}
          />
        </div>

        <div className="flex gap-4">
          <div className="space-y-1">
            <Label className="text-xs">题型</Label>
            <select
              className="rounded-md border bg-background px-3 py-1.5 text-sm"
              value={type}
              onChange={(e) => handleTypeChange(e.target.value as QuestionType)}
            >
              {(Object.keys(QUESTION_TYPE_LABELS) as QuestionType[]).map(
                (t) => (
                  <option key={t} value={t}>
                    {QUESTION_TYPE_LABELS[t]}
                  </option>
                )
              )}
            </select>
          </div>

          <div className="flex items-end gap-2">
            <label className="flex cursor-pointer items-center gap-1.5 text-sm">
              <input
                type="checkbox"
                checked={required}
                onChange={(e) => {
                  setRequired(e.target.checked)
                  markDirty()
                }}
              />
              必填
            </label>
          </div>
        </div>

        {(type === "SINGLE_CHOICE" || type === "MULTIPLE_CHOICE") && (
          <div className="space-y-2">
            <Label className="text-xs">选项</Label>
            {options.map((opt, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  value={opt}
                  onChange={(e) => {
                    const next = [...options]
                    next[i] = e.target.value
                    setOptions(next)
                    markDirty()
                  }}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setOptions(options.filter((_, j) => j !== i))
                    markDirty()
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setOptions([...options, `选项${options.length + 1}`])
                markDirty()
              }}
            >
              <PlusCircle className="mr-1 h-3 w-3" />
              添加选项
            </Button>
          </div>
        )}

        {type === "RATING" && (
          <p className="text-xs text-muted-foreground">评分范围：1 - 5 分</p>
        )}
      </CardContent>
    </Card>
  )
}
