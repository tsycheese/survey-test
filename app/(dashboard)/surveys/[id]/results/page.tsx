"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  ArrowLeft,
  BarChart3,
  CheckCircle,
  CircleDot,
  Clock,
  Download,
  FileText,
  ListTodo,
  MessageSquare,
  Star,
  Text,
  Users,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type QuestionType =
  | "SINGLE_CHOICE"
  | "MULTIPLE_CHOICE"
  | "TEXT"
  | "TEXTAREA"
  | "RATING"
  | "NPS"
  | "DROPDOWN"
  | "RANKING"

type QuestionConfig = {
  options?: { id: string; label: string }[]
  min?: number
  max?: number
  rows?: number
}

type QuestionStat = {
  id: string
  title: string
  type: QuestionType
  config: QuestionConfig | null
  answers: { value: unknown; submittedAt?: string }[]
}

type ResultsData = {
  survey: { title: string; description: string | null }
  totalResponses: number
  questions: QuestionStat[]
}

const TYPE_CONFIG: Record<
  QuestionType,
  { label: string; icon: typeof CircleDot; color: string }
> = {
  SINGLE_CHOICE: {
    label: "单选题",
    icon: CircleDot,
    color: "text-blue-500",
  },
  MULTIPLE_CHOICE: {
    label: "多选题",
    icon: CheckCircle,
    color: "text-green-500",
  },
  DROPDOWN: {
    label: "下拉选择",
    icon: ListTodo,
    color: "text-purple-500",
  },
  RANKING: {
    label: "排序题",
    icon: BarChart3,
    color: "text-orange-500",
  },
  TEXT: {
    label: "文本填空",
    icon: Text,
    color: "text-gray-500",
  },
  TEXTAREA: {
    label: "多行文本",
    icon: MessageSquare,
    color: "text-gray-500",
  },
  RATING: {
    label: "评分题",
    icon: Star,
    color: "text-yellow-500",
  },
  NPS: {
    label: "NPS",
    icon: Users,
    color: "text-indigo-500",
  },
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

  // 计算概览数据
  const totalQuestions = data.questions.length
  const answeredQuestions = data.questions.filter(
    (q) => q.answers.length > 0
  ).length

  return (
    <div className="min-h-svh bg-muted/30 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* 顶部导航 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/surveys")}
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              返回
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{data.survey.title}</h1>
              {data.survey.description && (
                <p className="text-sm text-muted-foreground">
                  {data.survey.description}
                </p>
              )}
            </div>
          </div>
          <Button variant="outline" size="sm">
            <Download className="mr-1 h-4 w-4" />
            导出数据
          </Button>
        </div>

        {/* 概览统计卡片 */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={Users}
            title="总回答数"
            value={data.totalResponses.toString()}
            description="已收集的问卷数量"
          />
          <StatCard
            icon={FileText}
            title="题目数量"
            value={totalQuestions.toString()}
            description="问卷包含的题目"
          />
          <StatCard
            icon={CheckCircle}
            title="有效回答"
            value={answeredQuestions.toString()}
            description="至少回答一题的数量"
            trend={`${Math.round((answeredQuestions / totalQuestions) * 100)}%`}
          />
          <StatCard
            icon={Clock}
            title="最近更新"
            value="刚刚"
            description="数据实时同步"
          />
        </div>

        {/* 题目统计列表 */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">题目统计详情</h2>
          <div className="grid gap-4 xl:grid-cols-2">
            {data.questions.map((q, index) => (
              <QuestionCard
                key={q.id}
                question={q}
                index={index}
                total={data.totalResponses}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({
  icon: Icon,
  title,
  value,
  description,
  trend,
}: {
  icon: typeof Users
  title: string
  value: string
  description: string
  trend?: string
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{title}</p>
              <p className="text-2xl font-bold">{value}</p>
            </div>
          </div>
          {trend && (
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
              {trend}
            </span>
          )}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}

function QuestionCard({
  question,
  index,
  total,
}: {
  question: QuestionStat
  index: number
  total: number
}) {
  const typeConfig = TYPE_CONFIG[question.type] || {
    label: question.type,
    icon: FileText,
    color: "text-gray-500",
  }
  const TypeIcon = typeConfig.icon

  return (
    <Card className="overflow-hidden">
      <div className="border-b bg-muted/50 p-6">
        <div className="flex items-start gap-3">
          <div className={`mt-0.5 ${typeConfig.color}`}>
            <TypeIcon className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h3 className="text-base leading-relaxed font-medium">
              <span className="text-muted-foreground">{index + 1}.</span>{" "}
              {question.title}
            </h3>
            <div className="mt-1 flex items-center gap-3">
              <span className="rounded-full bg-background px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {typeConfig.label}
              </span>
              <span className="text-xs text-muted-foreground">·</span>
              <span className="text-xs text-muted-foreground">
                {question.answers.length} 个回答
              </span>
            </div>
          </div>
        </div>
      </div>
      <CardContent className="p-4">
        <QuestionStats question={question} total={total} />
      </CardContent>
    </Card>
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

  if (type === "TEXT" || type === "TEXTAREA") {
    const texts = answers.map((a) => String(a.value)).filter(Boolean)
    if (texts.length === 0)
      return (
        <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
          <MessageSquare className="mr-2 h-4 w-4" />
          暂无回答
        </div>
      )
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            共 {texts.length} 条回答
          </span>
          <Button variant="ghost" size="sm">
            查看全部
          </Button>
        </div>
        <div className="max-h-48 space-y-2 overflow-y-auto">
          {texts.slice(0, 5).map((t, i) => (
            <div
              key={i}
              className="rounded-lg border bg-muted/50 px-3 py-2 text-sm"
            >
              <span className="text-muted-foreground">#{i + 1}</span>{" "}
              <span className="line-clamp-2">{t}</span>
            </div>
          ))}
          {texts.length > 5 && (
            <p className="text-center text-xs text-muted-foreground">
              还有 {texts.length - 5} 条回答...
            </p>
          )}
        </div>
      </div>
    )
  }

  if (type === "RATING" || type === "NPS") {
    const scores = answers.map((a) => Number(a.value)).filter((n) => !isNaN(n))
    if (scores.length === 0)
      return (
        <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
          <Star className="mr-2 h-4 w-4" />
          暂无评分
        </div>
      )
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length
    const maxScore = question.config?.max || 5
    const minScore = question.config?.min || 1
    const dist: Record<number, number> = {}
    for (let i = minScore; i <= maxScore; i++) {
      dist[i] = 0
    }
    scores.forEach((s) => {
      dist[s] = (dist[s] || 0) + 1
    })

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            <span className="text-3xl font-bold">{avg.toFixed(1)}</span>
            <span className="text-sm text-muted-foreground">
              / {maxScore} 分
            </span>
          </div>
          <div className="flex-1" />
          <div className="text-right">
            <p className="text-sm text-muted-foreground">基于</p>
            <p className="font-medium">{scores.length} 个评分</p>
          </div>
        </div>
        <div className="space-y-1.5">
          {Array.from(
            { length: maxScore - minScore + 1 },
            (_, i) => maxScore - i
          ).map((score) => {
            const count = dist[score] || 0
            const pct = scores.length ? (count / scores.length) * 100 : 0
            return (
              <div key={score} className="flex items-center gap-3 text-sm">
                <span className="flex w-6 items-center gap-0.5 font-medium">
                  {score}
                  <Star className="h-3 w-3 text-yellow-500" />
                </span>
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-yellow-500 transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-10 text-right text-xs text-muted-foreground">
                  {count}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // SINGLE_CHOICE / MULTIPLE_CHOICE / DROPDOWN / RANKING
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
    return (
      <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
        <CheckCircle className="mr-2 h-4 w-4" />
        暂无回答
      </div>
    )
  }

  const displayOptions =
    optionLabels.length > 0 ? optionLabels : Object.keys(counts)
  const maxCount = Math.max(...Object.values(counts), 1)

  return (
    <div className="space-y-3">
      {displayOptions.map((opt, idx) => {
        const count = counts[opt] || 0
        const pct = total > 0 ? (count / total) * 100 : 0
        const isTop = count === maxCount && count > 0
        return (
          <div key={`${opt}-${idx}`} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="line-clamp-1 flex-1">
                  {opt || "(未命名选项)"}
                </span>
                {isTop && count > 0 && (
                  <span className="rounded-full bg-yellow-100 px-1.5 py-0.5 text-xs font-medium text-yellow-700">
                    TOP
                  </span>
                )}
              </div>
              <span className="ml-2 whitespace-nowrap text-muted-foreground">
                {count} ({pct.toFixed(0)}%)
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full transition-all ${
                  isTop ? "bg-primary" : "bg-primary/60"
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
