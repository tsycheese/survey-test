"use client"

import { useEffect, useState } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { getQuestionDef } from "@/lib/questions/registry"
import type { Question, Survey } from "@/lib/questions/types"

export default function PublicSurveyPage() {
  const { token } = useParams<{ token: string }>()
  const searchParams = useSearchParams()
  const isPreview = searchParams.get("preview") === "1"
  const [survey, setSurvey] = useState<Survey | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [answers, setAnswers] = useState<Record<string, unknown>>({})

  useEffect(() => {
    const url = isPreview ? `/api/s/${token}?preview=1` : `/api/s/${token}`
    fetch(url).then(async (r) => {
      if (!r.ok) {
        setNotFound(true)
        setLoading(false)
        return
      }
      const data = await r.json()
      setSurvey({
        ...data,
        settings: data.settings ?? { showQuestionNumber: true },
      })
      setLoading(false)
    })
  }, [token, isPreview])

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

    // 预览模式：前端模拟提交
    if (isPreview) {
      await new Promise((resolve) => setTimeout(resolve, 500))
      setSubmitted(true)
      setSubmitting(false)
      return
    }

    // 真实提交
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
      <div className="flex min-h-svh items-center justify-center bg-muted/30">
        <div className="text-center">
          <h2 className="text-2xl font-bold">提交成功！</h2>
          <p className="mt-2 text-muted-foreground">感谢你的参与</p>
          {isPreview && (
            <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900 dark:bg-amber-950">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                试答模式：数据未保存到服务器
              </p>
            </div>
          )}
        </div>
      </div>
    )

  return (
    <div className="min-h-svh bg-muted/30 px-6 py-8">
      <div className="mx-auto max-w-[800px]">
        {/* 问卷纸张 - 使用编辑器画布样式 */}
        <div className="rounded-sm bg-background shadow-[0_4px_24px_rgba(0,0,0,0.10)] ring-1 ring-border">
          {/* 顶部色条 */}
          <div className="h-2 rounded-t-sm bg-primary" />

          <form onSubmit={handleSubmit}>
            {/* 标题区 */}
            <div className="border-b border-dashed border-border p-8">
              <h1 className="text-2xl font-bold tracking-tight">
                {survey!.title}
              </h1>
              {survey!.description && (
                <p className="mt-2 text-muted-foreground">
                  {survey!.description}
                </p>
              )}
            </div>

            {/* 题目列表 */}
            <div className="divide-y divide-dashed divide-border">
              {survey!.questions.map((q, index) => (
                <ResponseQuestionCard
                  key={q.id}
                  question={q}
                  index={index}
                  showNumber={survey!.settings?.showQuestionNumber ?? true}
                  value={answers[q.id]}
                  onChange={(v) => setAnswer(q.id, v)}
                />
              ))}
            </div>

            {/* 提交按钮区 */}
            <div className="border-t border-dashed border-border p-8">
              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={submitting}
              >
                {submitting ? "提交中..." : "提交"}
              </Button>
            </div>
          </form>
        </div>

        {/* 底部留白 */}
        <div className="h-8" />
      </div>
    </div>
  )
}

function ResponseQuestionCard({
  question,
  index,
  showNumber,
  value,
  onChange,
}: {
  question: Question
  index: number
  showNumber: boolean
  value: unknown
  onChange: (v: unknown) => void
}) {
  const def = getQuestionDef(question.type)
  const ResponseComponent = def.Response

  return (
    <div className="px-8 py-4">
      <ResponseComponent
        question={question}
        order={index + 1}
        showNumber={showNumber}
        value={value}
        onChange={onChange}
      />
    </div>
  )
}
