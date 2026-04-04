"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Sparkles, Loader2, CheckCircle2, AlertCircle } from "lucide-react"
import type { Question } from "@/lib/questions/types"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"

interface AIChatDialogProps {
  onConfirm: (questions: Question[]) => void
}

interface GeneratedQuestion {
  id: string
  type: string
  title: string
  required: boolean
  order: number
  config: Record<string, unknown>
}

export function AIChatDialog({ onConfirm }: AIChatDialogProps) {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generated, setGenerated] = useState<GeneratedQuestion[] | null>(null)

  const handleGenerate = async () => {
    if (!input.trim()) return

    setLoading(true)
    setError(null)
    setGenerated(null)

    try {
      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "生成失败")
      }

      setGenerated(data.questions)
    } catch (err) {
      setError(err instanceof Error ? err.message : "生成失败，请稍后重试")
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = () => {
    if (generated) {
      onConfirm(generated as Question[])
      setOpen(false)
      // 重置状态
      setInput("")
      setGenerated(null)
      setError(null)
    }
  }

  const handleReset = () => {
    setInput("")
    setGenerated(null)
    setError(null)
  }

  const getQuestionTypeLabel = (type: string) => {
    const map: Record<string, string> = {
      SINGLE_CHOICE: "单选",
      MULTIPLE_CHOICE: "多选",
      TEXT: "文本",
      RATING: "评分",
    }
    return map[type] || type
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Sparkles className="h-4 w-4" />
          AI 生成问卷
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI 生成问卷
          </DialogTitle>
          <DialogDescription>
            描述你想要的问卷，AI 会自动为你生成题目
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 输入区域 */}
          {!generated && (
            <>
              <Textarea
                placeholder="例如：我想做一个顾客满意度调查，包含产品质量、服务态度、价格评价等方面的问题"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="min-h-[120px]"
                disabled={loading}
              />
              {error && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={loading}
                >
                  取消
                </Button>
                <Button
                  onClick={handleGenerate}
                  disabled={loading || !input.trim()}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      生成中...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      生成问卷
                    </>
                  )}
                </Button>
              </div>
            </>
          )}

          {/* 结果预览 */}
          {generated && (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  已生成 {generated.length} 道题目
                </div>
                <Button variant="ghost" size="sm" onClick={handleReset}>
                  重新生成
                </Button>
              </div>

              <ScrollArea className="h-[300px] rounded-md border p-4">
                <div className="space-y-2">
                  {generated.map((q) => (
                    <Card key={q.id} className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="mb-1 flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">
                              {getQuestionTypeLabel(q.type)}
                            </Badge>
                            {q.required && (
                              <span className="text-xs text-destructive">
                                *
                              </span>
                            )}
                          </div>
                          <p className="text-sm">{q.title}</p>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          第 {q.order} 题
                        </span>
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleReset}>
                  重新生成
                </Button>
                <Button onClick={handleConfirm}>确认添加</Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
