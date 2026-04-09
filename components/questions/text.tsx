import { AlignLeft } from "lucide-react"
import { nanoid } from "nanoid"
import { useState } from "react"
import type {
  QuestionDef,
  TextQuestion,
  TextFormat,
} from "@/lib/questions/types"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { QuestionTitle } from "@/components/questions/question-title"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

const FORMAT_OPTIONS: {
  value: TextFormat
  label: string
  placeholder: string
}[] = [
  { value: "any", label: "不限", placeholder: "请输入文本" },
  { value: "number", label: "数字", placeholder: "请输入数字" },
  { value: "date", label: "日期 (YYYY-MM-DD)", placeholder: "YYYY-MM-DD" },
  { value: "email", label: "电子邮件", placeholder: "example@email.com" },
  { value: "phone", label: "手机号", placeholder: "13800138000" },
]

function getPlaceholder(format: TextFormat): string {
  return FORMAT_OPTIONS.find((f) => f.value === format)?.placeholder || "请输入"
}

function validateInput(value: string, format: TextFormat): boolean {
  if (format === "any") return true
  if (format === "number") return /^\d+$/.test(value)
  if (format === "date") return /^\d{4}-\d{2}-\d{2}$/.test(value)
  if (format === "email") return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
  if (format === "phone") return /^1\d{10}$/.test(value)
  return true
}

export const textDef: QuestionDef<TextQuestion> = {
  type: "TEXT",
  category: "text",
  label: "单行文本",
  icon: AlignLeft,
  defaultQuestion: (order) => ({
    id: nanoid(),
    type: "TEXT",
    title: "新问题",
    required: false,
    order,
    config: {
      placeholder: "",
      format: "any",
    },
  }),
  Canvas: ({ question }) => {
    const { format = "any", placeholder } = question.config
    const [value, setValue] = useState("")
    const [error, setError] = useState("")

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value
      setValue(newValue)

      if (validateInput(newValue, format as TextFormat)) {
        setError("")
      } else {
        setError("格式不正确")
      }
    }

    return (
      <>
        <Input
          type={format === "number" ? "number" : "text"}
          placeholder={placeholder || getPlaceholder(format as TextFormat)}
          value={value}
          onChange={handleChange}
          className={cn(
            "mt-3 h-10 text-base",
            error && "border-destructive focus-visible:ring-destructive"
          )}
          disabled
        />
        {error && <div className="mt-1 text-sm text-destructive">{error}</div>}
      </>
    )
  },
  Editor: ({ question, onChange, onSave }) => {
    const { config } = question
    const { placeholder = "", format = "any" } = config

    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">占位提示文字</Label>
          <Input
            value={placeholder}
            onChange={(e) =>
              onChange({
                ...question,
                config: { ...config, placeholder: e.target.value },
              })
            }
            onBlur={() => {
              const updated = { ...question }
              onSave?.(updated)
            }}
            placeholder="请输入..."
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">文本格式</Label>
          <Select
            value={format}
            onValueChange={(value: TextFormat) => {
              onChange({
                ...question,
                config: { ...config, format: value },
              })
              onSave?.({
                ...question,
                config: { ...config, format: value },
              })
            }}
          >
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FORMAT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    )
  },
  QuestionCard: ({
    question,
    order,
    showNumber = true,
    onTitleChange,
    onTitleBlur,
  }) => {
    const { format = "any", placeholder } = question.config

    return (
      <div className="relative px-3 py-3">
        <QuestionTitle
          order={order}
          showNumber={showNumber}
          title={question.title}
          required={question.required}
          onChange={onTitleChange}
          onBlur={onTitleBlur}
        />
        <Input
          type={format === "number" ? "number" : "text"}
          placeholder={placeholder || getPlaceholder(format as TextFormat)}
          className="mt-3 h-10 text-base"
          disabled
        />
      </div>
    )
  },
}
