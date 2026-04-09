import { Type } from "lucide-react"
import { nanoid } from "nanoid"
import type { QuestionDef, TextareaQuestion } from "@/lib/questions/types"
import { Textarea } from "@/components/ui/textarea"
import { QuestionTitle } from "@/components/questions/question-title"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

function QuestionCard({
  question,
  order,
  showNumber = true,
  onTitleChange,
  onTitleBlur,
}: {
  question: TextareaQuestion
  order: number
  showNumber?: boolean
  onUpdate?: (question: TextareaQuestion) => void
  onTitleChange?: (title: string) => void
  onTitleBlur?: (title: string) => void
  onOptionChange?: (question: TextareaQuestion) => void
}) {
  const { placeholder, maxLength, rows = 2 } = question.config

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

      <Textarea
        placeholder={placeholder || "请输入"}
        rows={rows}
        className={cn(
          "mt-3 w-full resize-none",
          rows === 1 && "!h-10 !min-h-10"
        )}
        style={
          rows > 1 ? { minHeight: `${40 + (rows - 1) * 20}px` } : undefined
        }
        disabled
      />
      {maxLength && (
        <div className="mt-1 text-right text-xs text-muted-foreground">
          0 / {maxLength}
        </div>
      )}
    </div>
  )
}

export const textareaDef: QuestionDef<TextareaQuestion> = {
  type: "TEXTAREA",
  category: "text",
  label: "多行文本",
  icon: Type,
  defaultQuestion: (order) => ({
    id: nanoid(),
    type: "TEXTAREA",
    title: "多行文本题",
    required: false,
    order,
    config: {
      placeholder: "请输入",
      maxLength: 500,
      rows: 2,
    },
  }),
  Canvas: ({ question }) => {
    const { placeholder, maxLength, rows = 2 } = question.config

    return (
      <>
        <Textarea
          placeholder={placeholder || "请输入"}
          rows={rows}
          className={cn("w-full resize-none", rows === 1 && "!h-10 !min-h-10")}
          style={
            rows > 1 ? { minHeight: `${40 + (rows - 1) * 20}px` } : undefined
          }
        />
        {maxLength && (
          <div className="mt-1 text-right text-xs text-muted-foreground">
            0 / {maxLength}
          </div>
        )}
      </>
    )
  },
  Editor: ({ question, onChange, onSave }) => {
    const { placeholder, maxLength, rows = 4 } = question.config

    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">占位文字</Label>
          <Input
            value={placeholder || ""}
            onChange={(e) =>
              onChange({
                ...question,
                config: { ...question.config, placeholder: e.target.value },
              })
            }
            onBlur={() => {
              const updated = { ...question }
              onSave?.(updated)
            }}
            className="h-8"
            placeholder="请输入占位文字"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">行数</Label>
          <Input
            type="number"
            min={1}
            max={20}
            value={rows}
            onChange={(e) =>
              onChange({
                ...question,
                config: {
                  ...question.config,
                  rows: parseInt(e.target.value) || 2,
                },
              })
            }
            onBlur={() => {
              const updated = { ...question }
              onSave?.(updated)
            }}
            className="h-8"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">
            最大字数（可选）
          </Label>
          <Input
            type="number"
            min={1}
            value={maxLength || ""}
            onChange={(e) =>
              onChange({
                ...question,
                config: {
                  ...question.config,
                  maxLength: parseInt(e.target.value) || undefined,
                },
              })
            }
            onBlur={() => {
              const updated = { ...question }
              onSave?.(updated)
            }}
            className="h-8"
            placeholder="不限制留空"
          />
        </div>
      </div>
    )
  },
  QuestionCard,
}
