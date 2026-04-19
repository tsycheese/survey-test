"use client"

import {
  CircleDot,
  CheckCircle,
  ListTodo,
  BarChart3,
  Text,
  MessageSquare,
  Star,
  Users,
  Hash,
  Smartphone,
  Mail,
  Calendar,
  User,
  VenetianMask,
  Cake,
  Grid3x3,
  ImageIcon,
  FileText,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import type { QuestionStat, QuestionType } from "../types"
import { ChoiceChartView } from "./question-chart"

const TYPE_CONFIG: Record<
  QuestionType,
  { label: string; icon: typeof CircleDot; color: string }
> = {
  SINGLE_CHOICE: { label: "单选题", icon: CircleDot, color: "text-blue-500" },
  MULTIPLE_CHOICE: {
    label: "多选题",
    icon: CheckCircle,
    color: "text-green-500",
  },
  DROPDOWN: { label: "下拉选择", icon: ListTodo, color: "text-purple-500" },
  RANKING: { label: "排序题", icon: BarChart3, color: "text-orange-500" },
  TEXT: { label: "文本填空", icon: Text, color: "text-gray-500" },
  TEXTAREA: { label: "多行文本", icon: MessageSquare, color: "text-gray-500" },
  RATING: { label: "评分题", icon: Star, color: "text-yellow-500" },
  NPS: { label: "NPS", icon: Users, color: "text-indigo-500" },
  NUMBER: { label: "数字", icon: Hash, color: "text-cyan-500" },
  CES: { label: "CES", icon: Star, color: "text-yellow-500" },
  PHONE: { label: "电话", icon: Smartphone, color: "text-gray-500" },
  EMAIL: { label: "邮箱", icon: Mail, color: "text-gray-500" },
  DATETIME: { label: "日期时间", icon: Calendar, color: "text-gray-500" },
  NAME: { label: "姓名", icon: User, color: "text-gray-500" },
  GENDER: { label: "性别", icon: VenetianMask, color: "text-pink-500" },
  BIRTHDAY: { label: "生日", icon: Cake, color: "text-rose-500" },
  MATRIX_SINGLE: { label: "矩阵单选", icon: Grid3x3, color: "text-teal-500" },
  IMAGE_SINGLE_CHOICE: {
    label: "图片单选",
    icon: ImageIcon,
    color: "text-blue-500",
  },
  IMAGE_MULTIPLE_CHOICE: {
    label: "图片多选",
    icon: ImageIcon,
    color: "text-green-500",
  },
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

  // 计算填写率和有效回答数
  const answeredCount = question.answers.filter((a) => {
    const v = a.value
    if (v === undefined || v === null || v === "") return false
    if (Array.isArray(v) && v.length === 0) return false
    if (typeof v === "object" && v !== null && Object.keys(v).length === 0)
      return false
    return true
  }).length
  const fillRate =
    total > 0 ? ((answeredCount / total) * 100).toFixed(1) : "0.0"

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
                填写率 {fillRate}% / 填写 {answeredCount}
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

  // 文本类
  if (
    type === "TEXT" ||
    type === "TEXTAREA" ||
    type === "PHONE" ||
    type === "EMAIL" ||
    type === "NAME"
  ) {
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

  // 评分类：RATING / NPS / CES / NUMBER
  if (
    type === "RATING" ||
    type === "NPS" ||
    type === "CES" ||
    type === "NUMBER"
  ) {
    const scores = answers.map((a) => Number(a.value)).filter((n) => !isNaN(n))
    if (scores.length === 0)
      return (
        <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
          <Star className="mr-2 h-4 w-4" />
          暂无数据
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
              / {maxScore} {type === "NUMBER" ? "" : "分"}
            </span>
          </div>
          <div className="flex-1" />
          <div className="text-right">
            <p className="text-sm text-muted-foreground">基于</p>
            <p className="font-medium">{scores.length} 个回答</p>
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
                  {type !== "NUMBER" && (
                    <Star className="h-3 w-3 text-yellow-500" />
                  )}
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

  // 日期时间
  if (type === "DATETIME" || type === "BIRTHDAY") {
    const values = answers.map((a) => String(a.value)).filter(Boolean)
    if (values.length === 0)
      return (
        <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
          <Calendar className="mr-2 h-4 w-4" />
          暂无回答
        </div>
      )
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            共 {values.length} 条回答
          </span>
        </div>
        <div className="max-h-48 space-y-2 overflow-y-auto">
          {values.slice(0, 5).map((v, i) => (
            <div
              key={i}
              className="rounded-lg border bg-muted/50 px-3 py-2 text-sm"
            >
              <span className="text-muted-foreground">#{i + 1}</span>{" "}
              <span>{v}</span>
            </div>
          ))}
          {values.length > 5 && (
            <p className="text-center text-xs text-muted-foreground">
              还有 {values.length - 5} 条回答...
            </p>
          )}
        </div>
      </div>
    )
  }

  // 矩阵单选
  if (type === "MATRIX_SINGLE") {
    const rows = question.config?.rows ?? []
    const cols = question.config?.columns ?? []
    if (rows.length === 0 || cols.length === 0)
      return (
        <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
          <Grid3x3 className="mr-2 h-4 w-4" />
          暂无配置
        </div>
      )

    // 统计每个单元格的选择次数
    const matrixCounts: Record<string, Record<string, number>> = {}
    rows.forEach((r) => {
      matrixCounts[r.label] = {}
      cols.forEach((c) => {
        matrixCounts[r.label][c.label] = 0
      })
    })

    answers.forEach((a) => {
      const val = a.value as Record<string, string> | undefined
      if (val && typeof val === "object") {
        Object.entries(val).forEach(([rowId, colId]) => {
          const rowLabel = rows.find((r) => r.id === rowId)?.label
          const colLabel = cols.find((c) => c.id === colId)?.label
          if (rowLabel && colLabel) {
            matrixCounts[rowLabel][colLabel] =
              (matrixCounts[rowLabel][colLabel] || 0) + 1
          }
        })
      }
    })

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="border-b p-2 text-left font-medium text-muted-foreground">
                行 \ 列
              </th>
              {cols.map((c) => (
                <th
                  key={c.id}
                  className="border-b p-2 text-center font-medium text-muted-foreground"
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="border-b p-2 font-medium">{r.label}</td>
                {cols.map((c) => {
                  const count = matrixCounts[r.label]?.[c.label] || 0
                  const pct =
                    answers.length > 0 ? (count / answers.length) * 100 : 0
                  return (
                    <td key={c.id} className="border-b p-2 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className="font-medium">{count}</span>
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  // 图片选择类
  if (type === "IMAGE_SINGLE_CHOICE" || type === "IMAGE_MULTIPLE_CHOICE") {
    const imageOptions =
      (
        question.config as {
          options?: { id: string; label?: string; title?: string }[]
        } | null
      )?.options ?? []
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

    if (imageOptions.length === 0 && Object.keys(counts).length === 0) {
      return (
        <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
          <ImageIcon className="mr-2 h-4 w-4" />
          暂无回答
        </div>
      )
    }

    const displayOptions =
      imageOptions.length > 0
        ? imageOptions
        : Object.keys(counts).map((id) => ({ id, label: id }))
    const maxCount = Math.max(...Object.values(counts), 1)

    const chartData = displayOptions.map((opt) => ({
      name:
        (opt as { title?: string; label?: string }).title ||
        (opt as { title?: string; label?: string }).label ||
        "(未命名选项)",
      count: counts[opt.id] || 0,
    }))

    return (
      <div className="space-y-4">
        {/* 数据表格 */}
        <div className="space-y-3">
          {displayOptions.map((opt) => {
            const count = counts[opt.id] || 0
            const pct = total > 0 ? (count / total) * 100 : 0
            const isTop = count === maxCount && count > 0
            return (
              <div key={opt.id} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="line-clamp-1 flex-1">
                      {(opt as { title?: string; label?: string }).title ||
                        (opt as { title?: string; label?: string }).label ||
                        "(未命名选项)"}
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
        {/* 图表 */}
        <ChoiceChartView
          data={chartData}
          total={total}
          title={question.title}
        />
      </div>
    )
  }

  // 性别（同单选题）
  if (type === "GENDER") {
    const genderOptions = question.config?.options ?? [
      { id: "male", label: "男" },
      { id: "female", label: "女" },
      { id: "other", label: "其他" },
    ]
    const counts: Record<string, number> = {}
    answers.forEach((a) => {
      counts[String(a.value)] = (counts[String(a.value)] || 0) + 1
    })

    const maxCount = Math.max(...Object.values(counts), 1)

    const chartData = genderOptions.map((opt) => ({
      name: opt.label,
      count: counts[opt.id] || 0,
    }))

    return (
      <div className="space-y-4">
        {/* 数据表格 */}
        <div className="space-y-3">
          {genderOptions.map((opt) => {
            const count = counts[opt.id] || 0
            const pct = total > 0 ? (count / total) * 100 : 0
            const isTop = count === maxCount && count > 0
            return (
              <div key={opt.id} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span>{opt.label}</span>
                    {isTop && count > 0 && (
                      <span className="rounded-full bg-yellow-100 px-1.5 py-0.5 text-xs font-medium text-yellow-700">
                        TOP
                      </span>
                    )}
                  </div>
                  <span className="text-muted-foreground">
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
        {/* 图表 */}
        <ChoiceChartView
          data={chartData}
          total={total}
          title={question.title}
        />
      </div>
    )
  }

  // 默认：单选/多选/下拉/排序
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

  const chartData = displayOptions.map((opt) => ({
    name: opt || "(未命名选项)",
    count: counts[opt] || 0,
  }))

  return (
    <div className="space-y-4">
      {/* 数据表格 */}
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
      {/* 图表 */}
      <ChoiceChartView data={chartData} total={total} title={question.title} />
    </div>
  )
}

export function ChartsTab({
  questions,
  total,
}: {
  questions: QuestionStat[]
  total: number
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">题目统计详情</h2>
      <div className="grid gap-4">
        {questions.map((q, index) => (
          <QuestionCard key={q.id} question={q} index={index} total={total} />
        ))}
      </div>
    </div>
  )
}
