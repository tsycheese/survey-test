"use client"

import { useParams } from "next/navigation"
import { useState, useCallback, useRef, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import {
  Sparkles,
  Loader2,
  Copy,
  Check,
  RefreshCw,
  AlertCircle,
  TrendingDown,
  TrendingUp,
  Clock,
  FileText,
} from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { cn } from "@/lib/utils"
import { useResultsData } from "../hooks/use-results-data"
import { ResultsHeader } from "../components/results-header"
import type { ResultsData } from "../types"

interface CachedSummary {
  content: string
  timestamp: number
  surveyId: string
  totalResponses: number
}

function getStorageKey(surveyId: string): string {
  return `ai-summary:${surveyId}`
}

function loadCached(surveyId: string): CachedSummary | null {
  try {
    const raw = localStorage.getItem(getStorageKey(surveyId))
    if (!raw) return null
    const parsed = JSON.parse(raw) as CachedSummary
    if (parsed.surveyId !== surveyId) return null
    return parsed
  } catch {
    return null
  }
}

function saveCached(surveyId: string, content: string, totalResponses: number) {
  try {
    const data: CachedSummary = {
      content,
      timestamp: Date.now(),
      surveyId,
      totalResponses,
    }
    localStorage.setItem(getStorageKey(surveyId), JSON.stringify(data))
  } catch {
    // ignore
  }
}

// ========== 工具函数 ==========

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}秒`
  const mins = Math.floor(seconds / 60)
  const remainingSecs = seconds % 60
  if (mins < 60) return `${mins}分${remainingSecs}秒`
  const hours = Math.floor(mins / 60)
  const remainingMins = mins % 60
  return `${hours}时${remainingMins}分`
}

// ========== KPI 卡片 ==========

function KpiCards({ data }: { data: ResultsData }) {
  const kpis = useMemo(() => {
    const ratingQs = data.questions.filter((q) =>
      ["RATING", "NPS", "CES"].includes(q.type)
    )

    let minAvg = Infinity
    let maxAvg = -Infinity
    let minTitle = ""
    let maxTitle = ""

    ratingQs.forEach((q) => {
      const scores = q.answers
        .map((a) => Number(a.value))
        .filter((n) => !isNaN(n))
      if (scores.length === 0) return
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length
      if (avg < minAvg) {
        minAvg = avg
        minTitle = q.title
      }
      if (avg > maxAvg) {
        maxAvg = avg
        maxTitle = q.title
      }
    })

    return [
      {
        label: "回收量",
        value: data.totalResponses.toString(),
        unit: "份",
        icon: FileText,
        color: "text-blue-500",
        bgColor: "bg-blue-500/10",
      },
      {
        label: "最低评分",
        value: minAvg === Infinity ? "-" : minAvg.toFixed(1),
        unit: "分",
        subtitle: minTitle,
        icon: TrendingDown,
        color: "text-red-500",
        bgColor: "bg-red-500/10",
      },
      {
        label: "最高评分",
        value: maxAvg === -Infinity ? "-" : maxAvg.toFixed(1),
        unit: "分",
        subtitle: maxTitle,
        icon: TrendingUp,
        color: "text-green-500",
        bgColor: "bg-green-500/10",
      },
      {
        label: "平均用时",
        value: formatDuration(data.avgCompletionTime),
        unit: "",
        icon: Clock,
        color: "text-amber-500",
        bgColor: "bg-amber-500/10",
      },
    ]
  }, [data])

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {kpis.map((kpi) => {
        const Icon = kpi.icon
        return (
          <Card key={kpi.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-lg",
                    kpi.bgColor
                  )}
                >
                  <Icon className={cn("h-4 w-4", kpi.color)} />
                </div>
                <span className="text-xs text-muted-foreground">
                  {kpi.label}
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-2xl font-bold">{kpi.value}</span>
                {kpi.unit && (
                  <span className="text-xs text-muted-foreground">
                    {kpi.unit}
                  </span>
                )}
              </div>
              {kpi.subtitle && (
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {kpi.subtitle}
                </p>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

// ========== Markdown 章节切分 ==========

type Section = {
  title: string
  content: string
}

function parseSections(markdown: string): Section[] {
  const lines = markdown.split("\n")
  const sections: Section[] = []
  let current: Section | null = null
  let prelude: string[] = []

  for (const line of lines) {
    const h2Match = line.match(/^##\s+(.+)$/)
    if (h2Match) {
      if (current) {
        sections.push({ title: current.title, content: current.content.trim() })
      } else if (prelude.length > 0) {
        sections.push({ title: "", content: prelude.join("\n").trim() })
        prelude = []
      }
      current = { title: h2Match[1], content: "" }
    } else if (current) {
      current.content += line + "\n"
    } else {
      prelude.push(line)
    }
  }

  if (current) {
    sections.push({ title: current.title, content: current.content.trim() })
  } else if (prelude.length > 0) {
    sections.push({ title: "", content: prelude.join("\n").trim() })
  }

  return sections
}

function SectionCard({ section }: { section: Section }) {
  if (!section.title) {
    return (
      <div className="prose prose-sm dark:prose-invert max-w-none px-2">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {section.content}
        </ReactMarkdown>
      </div>
    )
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-muted/30 pt-4 pb-3">
        <CardTitle className="text-base font-semibold">
          {section.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-5">
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {section.content}
          </ReactMarkdown>
        </div>
      </CardContent>
    </Card>
  )
}

// ========== 主组件 ==========

export default function SummaryPage() {
  const { id } = useParams<{ id: string }>()
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(
    null
  )
  const {
    data,
    loading: dataLoading,
    error: dataError,
  } = useResultsData(id, selectedVersionId)

  const [content, setContent] = useState("")
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const hasAutoGenerated = useRef(false)

  // 加载缓存
  useEffect(() => {
    if (!data) return
    const cached = loadCached(id)
    if (cached && cached.totalResponses === data.totalResponses) {
      setContent(cached.content)
    } else {
      setContent("")
    }
    hasAutoGenerated.current = false
  }, [id, data])

  // 进入页面时不自动触发，由用户手动点击生成

  const handleGenerate = useCallback(async () => {
    if (!data) return
    setGenerating(true)
    setError(null)
    setContent("")

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const res = await fetch("/api/ai/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          surveyTitle: data.survey.title,
          totalResponses: data.totalResponses,
          questions: data.questions.map((q) => ({
            title: q.title,
            type: q.type,
            config: q.config,
            answers: q.answers.map((a) => a.value),
          })),
        }),
        signal: controller.signal,
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setError(err.error || "生成失败")
        setGenerating(false)
        return
      }

      const reader = res.body?.getReader()
      if (!reader) {
        setError("无法读取响应")
        setGenerating(false)
        return
      }

      const decoder = new TextDecoder()
      let fullText = ""
      let done = false
      while (!done) {
        const { value, done: d } = await reader.read()
        done = d
        if (value) {
          const chunk = decoder.decode(value, { stream: true })
          fullText += chunk
          setContent(fullText)
        }
      }

      saveCached(id, fullText, data.totalResponses)
      setGenerating(false)
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        setError("生成失败，请检查网络连接或稍后重试")
      }
      setGenerating(false)
    }
  }, [data, id])

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [content])

  // 清理
  useEffect(() => {
    return () => {
      abortRef.current?.abort()
    }
  }, [])

  if (dataLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin" />
        加载中...
      </div>
    )
  }

  if (dataError || !data) {
    return (
      <div className="flex min-h-svh items-center justify-center">加载失败</div>
    )
  }

  const cached = loadCached(id)
  const hasCache = !!cached && cached.totalResponses === data.totalResponses

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <ResultsHeader
        title={data.survey.title}
        description={data.survey.description}
        versions={data.versions}
        currentVersionId={selectedVersionId}
        onVersionChange={setSelectedVersionId}
      />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-primary" />
            AI 数据洞察
          </CardTitle>
          <div className="flex items-center gap-2">
            {content && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1"
                onClick={handleCopy}
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                {copied ? "已复制" : "复制"}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1"
              onClick={handleGenerate}
              disabled={generating}
            >
              {generating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              {generating ? "生成中..." : hasCache ? "重新生成" : "生成总结"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {/* KPI 卡片：生成完成后展示 */}
          {content && !generating && <KpiCards data={data} />}

          <div
            className={cn(
              "rounded-lg border bg-muted/20",
              content && !generating ? "mt-4" : ""
            )}
          >
            <div className="p-4">
              {/* 已生成且非流式中：按章节卡片化展示 */}
              {content && !generating ? (
                <div className="space-y-4">
                  {parseSections(content).map((section, i) => (
                    <SectionCard key={i} section={section} />
                  ))}
                </div>
              ) : content && generating ? (
                /* 流式生成中：连续 prose 渲染，避免卡片跳动 */
                <div className="prose prose-sm dark:prose-invert max-w-none p-4">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {content}
                  </ReactMarkdown>
                </div>
              ) : generating ? (
                <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <p>AI 正在分析数据，请稍候...</p>
                  <p className="text-xs">这可能需要 10-30 秒</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
                  <Sparkles className="h-8 w-8 opacity-50" />
                  <p>点击右上角「生成总结」开始 AI 分析</p>
                  <p className="text-xs">
                    基于 {data.totalResponses} 份回答生成数据洞察报告
                  </p>
                </div>
              )}
              {generating && content && (
                <div className="flex items-center gap-2 py-2 text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span className="text-xs">继续生成中...</span>
                </div>
              )}
            </div>
          </div>

          {hasCache && !generating && (
            <div className="mt-3 text-right text-xs text-muted-foreground">
              上次生成：{new Date(cached!.timestamp).toLocaleString()}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
