"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sparkles, Loader2, X, Copy, Check } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import type { ResultsData } from "../types"

interface AISummaryDialogProps {
  data: ResultsData | null
}

export function AISummaryDialog({ data }: AISummaryDialogProps) {
  const [open, setOpen] = useState(false)
  const [content, setContent] = useState("")
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const handleGenerate = useCallback(async () => {
    if (!data) return
    setLoading(true)
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
        setContent(`> ⚠️ 生成失败：${err.error || "未知错误"}`)
        setLoading(false)
        return
      }

      const reader = res.body?.getReader()
      if (!reader) {
        setLoading(false)
        return
      }

      const decoder = new TextDecoder()
      let done = false
      while (!done) {
        const { value, done: d } = await reader.read()
        done = d
        if (value) {
          const chunk = decoder.decode(value, { stream: true })
          setContent((prev) => prev + chunk)
        }
      }
      setLoading(false)
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        setContent("> ⚠️ 生成失败，请检查网络连接或稍后重试")
      }
      setLoading(false)
    }
  }, [data])

  const handleOpen = useCallback(() => {
    setOpen(true)
    if (!content && !loading) {
      handleGenerate()
    }
  }, [content, loading, handleGenerate])

  const handleClose = useCallback(() => {
    abortRef.current?.abort()
    setOpen(false)
  }, [])

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [content])

  // 自动滚动到底部
  useEffect(() => {
    if (scrollRef.current && loading) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [content, loading])

  return (
    <>
      <button
        onClick={handleOpen}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <Sparkles className="h-4 w-4" />
        AI 总结
      </button>

      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (!v) handleClose()
          else setOpen(true)
        }}
      >
        <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-3xl">
          <DialogHeader className="shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                AI 数据洞察
              </DialogTitle>
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
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleClose}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </DialogHeader>

          <ScrollArea className="flex-1 overflow-y-auto" ref={scrollRef}>
            <div className="prose prose-sm dark:prose-invert max-w-none px-1">
              {content ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {content}
                </ReactMarkdown>
              ) : loading ? (
                <div className="flex items-center gap-2 py-8 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  AI 正在分析数据...
                </div>
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  点击生成按钮开始分析
                </div>
              )}
              {loading && content && (
                <div className="flex items-center gap-2 py-2 text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span className="text-xs">继续生成中...</span>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="shrink-0 border-t pt-4">
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose}>
                关闭
              </Button>
              <Button
                onClick={handleGenerate}
                disabled={loading}
                className="gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    生成中...
                  </>
                ) : content ? (
                  <>
                    <Sparkles className="h-4 w-4" />
                    重新生成
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    开始分析
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
