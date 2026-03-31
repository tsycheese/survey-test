"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"

type QuestionType = "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "TEXT" | "RATING"

type QuestionConfig = {
  options?: { id: string; label: string }[]
  placeholder?: string
  multiline?: boolean
  min?: number
  max?: number
  minLabel?: string
  maxLabel?: string
}

type Question = {
  id: string
  title: string
  type: QuestionType
  order: number
  required: boolean
  config: QuestionConfig | null
}

type Survey = {
  id: string
  title: string
  description: string | null
  questions: Question[]
}

export default function PublicSurveyPage() {
  const { token } = useParams<{ token: string }>()
  const [survey, setSurvey] = useState<Survey | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [answers, setAnswers] = useState<Record<string, unknown>>({})

  useEffect(() => {
    fetch(`/api/s/${token}`).then(async (r) => {
      if (!r.ok) {
        setNotFound(true)
        setLoading(false)
        return
      }
      const data = await r.json()
      setSurvey(data)
      setLoading(false)
    })
  }, [token])

  function setAnswer(questionId: string, value: unknown) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!survey) return

    // 验证必填题
    for (const q of survey.questions) {
      if (!q.required) continue
      const ans = answers[q.id]
      if (ans === undefined || ans === null || ans === "") {
        toast.error(`「${q.title}」为必填题`)
        return
      }
      if (Array.isArray(ans) && ans.length === 0) {
        toast.error(`「${q.title}」为必填题`)
        return
      }
    }

    setSubmitting(true)
    const res = await fetch(`/api/s/${token}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers }),
    })
    if (res.ok) {
      setSubmitted(true)
    } else {
      const data = await res.json()
      toast.error(data.error || "提交失败")
    }
    setSubmitting(false)
  }

  if (loading)
    return (
      <div className="flex min-h-svh items-center justify-center">
        加载中...
      </div>
    )
  if (notFound)
    return (
      <div className="flex min-h-svh items-center justify-center">
        <p className="text-muted-foreground">问卷不存在或已关闭</p>
      </div>
    )
  if (submitted)
    return (
      <div className="flex min-h-svh items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold">提交成功！</h2>
          <p className="mt-2 text-muted-foreground">感谢你的参与</p>
        </div>
      </div>
    )

  return (
    <div className="min-h-svh bg-muted/30 p-6">
      <div className="mx-auto max-w-xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">{survey!.title}</h1>
          {survey!.description && (
            <p className="mt-1 text-muted-foreground">{survey!.description}</p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {survey!.questions.map((q, index) => (
            <Card key={q.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  {index + 1}. {q.title}
                  {q.required && (
                    <span className="ml-1 text-destructive">*</span>
                  )}
                </CardTitle>
                {q.type === "MULTIPLE_CHOICE" && (
                  <CardDescription>可多选</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <QuestionInput
                  question={q}
                  value={answers[q.id]}
                  onChange={(v) => setAnswer(q.id, v)}
                />
              </CardContent>
            </Card>
          ))}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "提交中..." : "提交"}
          </Button>
        </form>
      </div>
    </div>
  )
}

function QuestionInput({
  question,
  value,
  onChange,
}: {
  question: Question
  value: unknown
  onChange: (v: unknown) => void
}) {
  const { type } = question
  const options = question.config?.options ?? []

  if (type === "TEXT") {
    return (
      <Input
        placeholder="请输入你的回答"
        value={String(value ?? "")}
        onChange={(e) => onChange(e.target.value)}
      />
    )
  }

  if (type === "RATING") {
    const current = Number(value) || 0
    return (
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className={`h-10 w-10 rounded-full border text-sm font-medium transition-colors ${
              current === star
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border hover:border-primary"
            }`}
          >
            {star}
          </button>
        ))}
      </div>
    )
  }

  if (type === "SINGLE_CHOICE") {
    return (
      <div className="space-y-2">
        {options.map((opt) => (
          <label
            key={opt.id}
            className="flex cursor-pointer items-center gap-2 text-sm"
          >
            <input
              type="radio"
              name={question.id}
              value={opt.label}
              checked={value === opt.label}
              onChange={() => onChange(opt.label)}
            />
            {opt.label}
          </label>
        ))}
      </div>
    )
  }

  // MULTIPLE_CHOICE
  const selected = Array.isArray(value) ? (value as string[]) : []
  return (
    <div className="space-y-2">
      {options.map((opt) => (
        <label
          key={opt.id}
          className="flex cursor-pointer items-center gap-2 text-sm"
        >
          <input
            type="checkbox"
            checked={selected.includes(opt.label)}
            onChange={(e) => {
              if (e.target.checked) {
                onChange([...selected, opt.label])
              } else {
                onChange(selected.filter((s) => s !== opt.label))
              }
            }}
          />
          {opt.label}
        </label>
      ))}
    </div>
  )
}
