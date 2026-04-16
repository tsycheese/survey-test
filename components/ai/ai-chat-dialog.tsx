"use client"

import { useState, useMemo } from "react"
import { experimental_useObject as useObject } from "@ai-sdk/react"
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
import {
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Wand2,
} from "lucide-react"
import type { Question } from "@/lib/questions/types"
import { aiGenerateResultSchema } from "@/lib/ai/schema"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { nanoid } from "nanoid"

interface AIChatDialogProps {
  onConfirm: (
    questions: Question[],
    surveyTitle?: string,
    surveyDescription?: string
  ) => void
}

interface StreamQuestion {
  id: string
  type: string
  title: string
  description?: string
  required: boolean
  order: number
  config: Record<string, unknown>
}

export function AIChatDialog({ onConfirm }: AIChatDialogProps) {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState("")
  const [hasStarted, setHasStarted] = useState(false)

  const { object, submit, isLoading, error, stop } = useObject({
    api: "/api/ai/generate-stream",
    schema: aiGenerateResultSchema,
  })

  // 将流式对象转换为带 id/order 的题目列表
  const generatedQuestions = useMemo<StreamQuestion[]>(() => {
    if (!object?.questions) return []
    return object.questions
      .filter((q): q is Record<string, unknown> => q != null)
      .map((q, index) => ({
        ...(q as Record<string, unknown>),
        id: nanoid(),
        order: index + 1,
        config: (q as Record<string, unknown>).config || {},
      })) as StreamQuestion[]
  }, [object])

  const surveyTitle = (object?.surveyTitle as string) || ""
  const surveyDescription = (object?.surveyDescription as string) || ""
  const isStreaming = isLoading && generatedQuestions.length > 0

  const handleGenerate = () => {
    if (!input.trim()) return
    setHasStarted(true)
    submit({ input })
  }

  const handleConfirm = () => {
    if (generatedQuestions.length > 0) {
      onConfirm(
        generatedQuestions as Question[],
        surveyTitle || undefined,
        surveyDescription || undefined
      )
      setOpen(false)
      resetState()
    }
  }

  const handleReset = () => {
    stop()
    resetState()
  }

  const resetState = () => {
    setInput("")
    setHasStarted(false)
  }

  const getQuestionTypeLabel = (type: string) => {
    const map: Record<string, string> = {
      SINGLE_CHOICE: "单选",
      MULTIPLE_CHOICE: "多选",
      DROPDOWN: "下拉",
      RANKING: "排序",
      MATRIX_SINGLE: "矩阵",
      TEXT: "文本",
      TEXTAREA: "多行文本",
      NUMBER: "数字",
      RATING: "评分",
      NPS: "NPS",
      CES: "CES",
      NAME: "姓名",
      GENDER: "性别",
      BIRTHDAY: "生日",
      PHONE: "电话",
      EMAIL: "邮箱",
      DATETIME: "日期时间",
      IMAGE_SINGLE_CHOICE: "图片单选",
      IMAGE_MULTIPLE_CHOICE: "图片多选",
    }
    return map[type] || type
  }

  const renderQuestionPreview = (q: StreamQuestion) => {
    const config = q.config || {}
    const options = config.options as Array<{ label: string }> | undefined
    const rows = config.rows as Array<{ label: string }> | undefined
    const columns = config.columns as
      | Array<{ label: string }>
      | number
      | undefined
    const minLabel = config.minLabel as string | undefined
    const maxLabel = config.maxLabel as string | undefined
    const placeholder = config.placeholder as string | undefined

    return (
      <div className="mt-2 space-y-1.5 text-xs text-muted-foreground">
        {options && options.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {options.map((opt, i) => (
              <span
                key={i}
                className="rounded bg-muted px-1.5 py-0.5 text-[10px]"
              >
                {opt.label}
              </span>
            ))}
          </div>
        )}
        {rows && Array.isArray(rows) && (
          <div className="text-[10px]">
            矩阵: {rows.length} 行 ×{" "}
            {(columns as Array<{ label: string }>)?.length || String(columns)}{" "}
            列
          </div>
        )}
        {(minLabel || maxLabel) && (
          <div className="text-[10px]">
            {minLabel && <span>{minLabel}</span>}
            {minLabel && maxLabel && <span className="mx-1">→</span>}
            {maxLabel && <span>{maxLabel}</span>}
          </div>
        )}
        {placeholder && (
          <div className="text-[10px] text-muted-foreground/70">
            提示: {placeholder}
          </div>
        )}
      </div>
    )
  }

  const showResult = hasStarted && (generatedQuestions.length > 0 || !isLoading)
  const showEmptyLoading = isLoading && generatedQuestions.length === 0

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          stop()
          resetState()
        }
        setOpen(v)
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Sparkles className="h-4 w-4" />
          AI 生成问卷
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI 生成问卷
          </DialogTitle>
          <DialogDescription>
            描述你想要的问卷，AI 会自动为你生成贴合场景的题目
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 输入区域 */}
          {!showResult && (
            <>
              <Textarea
                placeholder="例如：我想做一个顾客满意度调查，包含产品质量、服务态度、价格评价等方面的问题"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="min-h-[120px]"
                disabled={isLoading}
              />
              {error && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  {error.message || "生成失败，请稍后重试"}
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={isLoading}
                >
                  取消
                </Button>
                <Button
                  onClick={handleGenerate}
                  disabled={isLoading || !input.trim()}
                >
                  {showEmptyLoading ? (
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
          {showResult && (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {isStreaming ? (
                    <>
                      <Wand2 className="h-4 w-4 animate-pulse text-primary" />
                      已生成 {generatedQuestions.length} 道题目...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      已生成 {generatedQuestions.length} 道题目
                    </>
                  )}
                </div>
                <Button variant="ghost" size="sm" onClick={handleReset}>
                  重新生成
                </Button>
              </div>

              {surveyTitle && (
                <div className="rounded-md border bg-muted/50 px-3 py-2">
                  <div className="text-sm font-medium">{surveyTitle}</div>
                  {surveyDescription && (
                    <div className="text-xs text-muted-foreground">
                      {surveyDescription}
                    </div>
                  )}
                </div>
              )}

              <ScrollArea className="h-[320px] rounded-md border">
                <div className="space-y-3 p-4">
                  {generatedQuestions.map((q) => (
                    <Card key={q.id} className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex flex-wrap items-center gap-2">
                            <Badge variant="secondary" className="text-xs">
                              {getQuestionTypeLabel(q.type)}
                            </Badge>
                            {q.required && (
                              <span className="text-xs text-destructive">
                                *
                              </span>
                            )}
                          </div>
                          <p className="text-sm font-medium">{q.title}</p>
                          {q.description && (
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {q.description}
                            </p>
                          )}
                          {renderQuestionPreview(q)}
                        </div>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          第 {q.order} 题
                        </span>
                      </div>
                    </Card>
                  ))}
                  {isStreaming && (
                    <Card className="flex items-center gap-2 border-dashed p-3 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      AI 正在思考下一道题...
                    </Card>
                  )}
                </div>
              </ScrollArea>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleReset}>
                  重新生成
                </Button>
                <Button onClick={handleConfirm} disabled={isStreaming}>
                  {isStreaming ? "生成中..." : "确认添加"}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
