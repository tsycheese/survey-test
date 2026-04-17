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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Wand2,
  ArrowRight,
  MessageCircle,
} from "lucide-react"
import type { Question } from "@/lib/questions/types"
import { aiGenerateResultSchema } from "@/lib/ai/schema"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { nanoid } from "nanoid"

type ClarifyQuestion = {
  id: string
  question: string
  type: "single_choice" | "multiple_choice" | "text"
  options?: string[]
  placeholder?: string
}

type Step = "input" | "clarify" | "generate"

interface AIClarifyDialogProps {
  onConfirm: (
    questions: Question[],
    surveyTitle?: string,
    surveyDescription?: string
  ) => void
}

function getQuestionTypeLabel(type: string) {
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
  }
  return map[type] || type
}

export function AIClarifyDialog({ onConfirm }: AIClarifyDialogProps) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<Step>("input")
  const [messages, setMessages] = useState<
    Array<{ role: "user" | "assistant"; content: string }>
  >([])
  const [input, setInput] = useState("")
  const [clarifyQuestions, setClarifyQuestions] = useState<ClarifyQuestion[]>(
    []
  )
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({})
  const [clarifyLoading, setClarifyLoading] = useState(false)
  const [clarifyError, setClarifyError] = useState<string | null>(null)

  const {
    object,
    submit,
    isLoading: isGenerating,
    error: generateError,
    stop,
  } = useObject({
    api: "/api/ai/generate-stream",
    schema: aiGenerateResultSchema,
  })

  const generatedQuestions = useMemo<Question[]>(() => {
    if (!object?.questions) return []
    return object.questions
      .filter((q: unknown) => q != null)
      .map((q: unknown, index: number) => ({
        ...(q as Record<string, unknown>),
        id: nanoid(),
        order: index + 1,
        config: (q as Record<string, unknown>).config || {},
      })) as Question[]
  }, [object])

  const surveyTitle = (object?.surveyTitle as string) || ""
  const surveyDescription = (object?.surveyDescription as string) || ""
  const isStreaming = isGenerating && generatedQuestions.length > 0

  const handleStart = async () => {
    if (!input.trim()) return
    const newMessages = [{ role: "user" as const, content: input.trim() }]
    setMessages(newMessages)
    setClarifyLoading(true)
    setClarifyError(null)

    try {
      const res = await fetch("/api/ai/clarify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "分析失败")
      }

      if (data.ready) {
        // 直接生成
        setStep("generate")
        submit({ input: buildFinalPrompt(newMessages, {}) })
      } else {
        setClarifyQuestions(data.questions || [])
        setStep("clarify")
      }
    } catch (err) {
      setClarifyError(err instanceof Error ? err.message : "分析失败")
    } finally {
      setClarifyLoading(false)
    }
  }

  const handleSubmitAnswers = async (skip = false) => {
    const answerText = skip
      ? "用户选择跳过补充问题，请基于已有信息直接生成问卷。"
      : Object.entries(answers)
          .map(([id, ans]) => {
            const q = clarifyQuestions.find((cq) => cq.id === id)
            const value = Array.isArray(ans) ? ans.join("、") : ans
            return `${q?.question} ${value}`
          })
          .join("；")

    const newMessages = [
      ...messages,
      {
        role: "assistant" as const,
        content: `我需要了解一些补充信息：${clarifyQuestions.map((q) => q.question).join("；")}`,
      },
      { role: "user" as const, content: answerText },
    ]
    setMessages(newMessages)
    setClarifyLoading(true)
    setClarifyError(null)

    try {
      const res = await fetch("/api/ai/clarify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "分析失败")
      }

      if (data.ready || skip) {
        setStep("generate")
        submit({ input: buildFinalPrompt(newMessages, {}) })
      } else {
        setClarifyQuestions(data.questions || [])
        setAnswers({})
        // 保持在 clarify 步骤，更新问题
      }
    } catch (err) {
      setClarifyError(err instanceof Error ? err.message : "分析失败")
    } finally {
      setClarifyLoading(false)
    }
  }

  const handleConfirm = () => {
    if (generatedQuestions.length > 0) {
      onConfirm(
        generatedQuestions,
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
    setStep("input")
    setMessages([])
    setInput("")
    setClarifyQuestions([])
    setAnswers({})
    setClarifyError(null)
  }

  const renderQuestionPreview = (q: Question) => {
    const config = (q.config as Record<string, unknown>) || {}
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
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step === "input" && (
              <MessageCircle className="h-5 w-5 text-primary" />
            )}
            {step === "clarify" && (
              <MessageCircle className="h-5 w-5 text-primary" />
            )}
            {(step === "generate" || generatedQuestions.length > 0) && (
              <Wand2 className="h-5 w-5 text-primary" />
            )}
            AI 问卷助手
          </DialogTitle>
          <DialogDescription>
            {step === "input" && "描述您想要的问卷，AI 会帮您分析并生成"}
            {step === "clarify" && "为了生成更贴合的问卷，请回答以下问题"}
            {step === "generate" && "AI 正在根据您的需求生成问卷题目"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 输入阶段 */}
          {step === "input" && (
            <>
              <Textarea
                placeholder="例如：我想做一个顾客满意度调查，包含产品质量、服务态度、价格评价等方面的问题"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="min-h-[120px]"
                disabled={clarifyLoading}
              />
              {clarifyError && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  {clarifyError}
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={clarifyLoading}
                >
                  取消
                </Button>
                <Button
                  onClick={handleStart}
                  disabled={clarifyLoading || !input.trim()}
                >
                  {clarifyLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      分析中...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      开始
                    </>
                  )}
                </Button>
              </div>
            </>
          )}

          {/* 澄清阶段 */}
          {step === "clarify" && (
            <>
              <div className="rounded-md border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">您的需求：</span>
                {messages[0]?.content}
              </div>

              <div className="space-y-4">
                {clarifyQuestions.map((q) => (
                  <div key={q.id} className="space-y-2">
                    <Label className="text-sm font-medium">{q.question}</Label>
                    {q.type === "single_choice" &&
                      q.options &&
                      q.options.length > 0 && (
                        <RadioGroup
                          value={(answers[q.id] as string) || ""}
                          onValueChange={(value) =>
                            setAnswers((prev) => ({ ...prev, [q.id]: value }))
                          }
                          className="flex flex-wrap gap-2"
                        >
                          {q.options.map((opt) => (
                            <div
                              key={opt}
                              className="flex items-center space-x-2"
                            >
                              <RadioGroupItem
                                value={opt}
                                id={`${q.id}-${opt}`}
                              />
                              <Label
                                htmlFor={`${q.id}-${opt}`}
                                className="cursor-pointer text-sm font-normal"
                              >
                                {opt}
                              </Label>
                            </div>
                          ))}
                        </RadioGroup>
                      )}
                    {q.type === "multiple_choice" &&
                      q.options &&
                      q.options.length > 0 && (
                        <div className="flex flex-wrap gap-3">
                          {q.options.map((opt) => (
                            <div
                              key={opt}
                              className="flex items-center space-x-2"
                            >
                              <Checkbox
                                id={`${q.id}-${opt}`}
                                checked={(
                                  (answers[q.id] as string[]) || []
                                ).includes(opt)}
                                onCheckedChange={(
                                  checked: boolean | "indeterminate"
                                ) => {
                                  const current =
                                    (answers[q.id] as string[]) || []
                                  setAnswers((prev) => ({
                                    ...prev,
                                    [q.id]: checked
                                      ? [...current, opt]
                                      : current.filter((v) => v !== opt),
                                  }))
                                }}
                              />
                              <Label
                                htmlFor={`${q.id}-${opt}`}
                                className="cursor-pointer text-sm font-normal"
                              >
                                {opt}
                              </Label>
                            </div>
                          ))}
                        </div>
                      )}
                    {q.type === "text" && (
                      <Input
                        value={(answers[q.id] as string) || ""}
                        onChange={(e) =>
                          setAnswers((prev) => ({
                            ...prev,
                            [q.id]: e.target.value,
                          }))
                        }
                        placeholder={q.placeholder || "请输入"}
                      />
                    )}
                  </div>
                ))}
              </div>

              {clarifyError && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  {clarifyError}
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={handleReset}
                  disabled={clarifyLoading}
                >
                  重新输入
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => handleSubmitAnswers(true)}
                  disabled={clarifyLoading}
                >
                  跳过
                </Button>
                <Button
                  onClick={() => handleSubmitAnswers(false)}
                  disabled={clarifyLoading}
                >
                  {clarifyLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      分析中...
                    </>
                  ) : (
                    <>
                      继续
                      <ArrowRight className="ml-1.5 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </>
          )}

          {/* 生成阶段 */}
          {step === "generate" && (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {isStreaming ? (
                    <>
                      <Wand2 className="h-4 w-4 animate-pulse text-primary" />
                      已生成 {generatedQuestions.length} 道题目...
                    </>
                  ) : generatedQuestions.length > 0 ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      已生成 {generatedQuestions.length} 道题目
                    </>
                  ) : (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      生成中...
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
                      AI 正在生成下一道题...
                    </Card>
                  )}
                </div>
              </ScrollArea>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleReset}>
                  重新生成
                </Button>
                <Button
                  onClick={handleConfirm}
                  disabled={isStreaming || generatedQuestions.length === 0}
                >
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

function buildFinalPrompt(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  answers: Record<string, string>
): string {
  let prompt = "请根据以下信息生成一份问卷：\n\n"
  messages.forEach((m) => {
    prompt += `${m.role === "user" ? "用户" : "顾问"}：${m.content}\n`
  })
  if (Object.keys(answers).length > 0) {
    prompt += "\n补充信息：\n"
    Object.entries(answers).forEach(([id, ans]) => {
      prompt += `- ${id}: ${ans}\n`
    })
  }
  return prompt
}
