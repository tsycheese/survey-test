"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type QuestionType = "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "TEXT" | "RATING"

type QuestionConfig = {
  options?: { id: string; label: string }[]
  min?: number
  max?: number
}

type QuestionStat = {
  id: string
  title: string
  type: QuestionType
  config: QuestionConfig | null
  answers: { value: unknown }[]
}

type ResultsData = {
  survey: { title: string; description: string | null }
  totalResponses: number
  questions: QuestionStat[]
}

const TYPE_LABELS: Record<QuestionType, string> = {
  SINGLE_CHOICE: "单选题",
  MULTIPLE_CHOICE: "多选题",
  TEXT: "文本填空",
  RATING: "评分题",
}

export default function ResultsPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [data, setData] = useState<ResultsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/surveys/${id}/responses`)
      .then((r) => r.json())
      .then((d) => {
        setData(d)
        setLoading(false)
      })
  }, [id])

  if (loading)
    return (
      <div className="flex min-h-svh items-center justify-center">
        加载中...
      </div>
    )
  if (!data)
    return (
      <div className="flex min-h-svh items-center justify-center">加载失败</div>
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
          <div>
            <h1 className="text-xl font-bold">{data.survey.title}</h1>
            <p className="text-sm text-muted-foreground">
              共 {data.totalResponses} 份回答
            </p>
          </div>
        </div>

        {data.questions.map((q, index) => (
          <Card key={q.id}>
            <CardHeader>
              <CardTitle className="text-base">
                {index + 1}. {q.title}
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  {TYPE_LABELS[q.type]}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <QuestionStats question={q} total={data.totalResponses} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

function QuestionStats({
  question,
  total,
}: {
  question: QuestionStat
  total: number
}) {
  const { type, answers } = question
  const options = question.config?.options ?? []

  if (type === "TEXT") {
    const texts = answers.map((a) => String(a.value)).filter(Boolean)
    if (texts.length === 0)
      return <p className="text-sm text-muted-foreground">暂无回答</p>
    return (
      <ul className="space-y-1">
        {texts.map((t, i) => (
          <li key={i} className="rounded bg-muted px-3 py-1.5 text-sm">
            {t}
          </li>
        ))}
      </ul>
    )
  }

  if (type === "RATING") {
    const scores = answers.map((a) => Number(a.value)).filter((n) => !isNaN(n))
    if (scores.length === 0)
      return <p className="text-sm text-muted-foreground">暂无回答</p>
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length
    const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    scores.forEach((s) => {
      dist[s] = (dist[s] || 0) + 1
    })
    return (
      <div className="space-y-2">
        <p className="text-sm font-medium">平均分：{avg.toFixed(1)}</p>
        {[1, 2, 3, 4, 5].map((star) => (
          <div key={star} className="flex items-center gap-2 text-sm">
            <span className="w-8">{star} 分</span>
            <div className="h-4 flex-1 overflow-hidden rounded bg-muted">
              <div
                className="h-full bg-primary transition-all"
                style={{
                  width: `${scores.length ? (dist[star] / scores.length) * 100 : 0}%`,
                }}
              />
            </div>
            <span className="w-8 text-right text-muted-foreground">
              {dist[star]}
            </span>
          </div>
        ))}
      </div>
    )
  }

  // SINGLE_CHOICE / MULTIPLE_CHOICE
  const optionLabels = options.map((o) => o.label)
  const counts: Record<string, number> = {}
  answers.forEach((a) => {
    const val = a.value
    if (Array.isArray(val)) {
      val.forEach((v) => {
        counts[String(v)] = (counts[String(v)] || 0) + 1
      })
    } else {
      counts[String(val)] = (counts[String(val)] || 0) + 1
    }
  })

  if (optionLabels.length === 0 && Object.keys(counts).length === 0) {
    return <p className="text-sm text-muted-foreground">暂无回答</p>
  }

  const displayOptions =
    optionLabels.length > 0 ? optionLabels : Object.keys(counts)

  return (
    <div className="space-y-2">
      {displayOptions.map((opt, idx) => {
        const count = counts[opt] || 0
        const pct = total > 0 ? (count / total) * 100 : 0
        return (
          <div key={`${opt}-${idx}`} className="space-y-0.5">
            <div className="flex justify-between text-sm">
              <span>{opt}</span>
              <span className="text-muted-foreground">
                {count} ({pct.toFixed(0)}%)
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded bg-muted">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
