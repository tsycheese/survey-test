import { Hash } from "lucide-react"
import { nanoid } from "nanoid"
import type { QuestionDef, NumberQuestion } from "@/lib/questions/types"
import { Input } from "@/components/ui/input"
import { QuestionTitle } from "@/components/questions/question-title"
import { QuestionTitleReadonly } from "@/components/questions/question-title-readonly"
import { Label } from "@/components/ui/label"
import { Input as UIInput } from "@/components/ui/input"

function QuestionCard({
  question,
  order,
  showNumber = true,
  onTitleChange,
  onTitleBlur,
  onDescriptionChange,
  onDescriptionBlur,
}: {
  question: NumberQuestion
  order: number
  showNumber?: boolean
  onUpdate?: (question: NumberQuestion) => void
  onTitleChange?: (title: string) => void
  onTitleBlur?: (title: string) => void
  onDescriptionChange?: (description: string) => void
  onDescriptionBlur?: (description: string) => void
  onOptionChange?: (question: NumberQuestion) => void
}) {
  const { placeholder, prefix, suffix } = question.config

  return (
    <div className="relative px-3 py-3">
      <QuestionTitle
        order={order}
        showNumber={showNumber}
        title={question.title}
        description={question.description}
        required={question.required}
        onChange={onTitleChange}
        onBlur={onTitleBlur}
        onDescriptionChange={onDescriptionChange}
        onDescriptionBlur={onDescriptionBlur}
      />

      <div className="mt-3 flex items-center gap-2">
        {prefix && (
          <span className="text-sm text-muted-foreground">{prefix}</span>
        )}
        <Input
          type="number"
          placeholder={placeholder || "请输入数字"}
          className="h-10 flex-1 text-sm"
          disabled
        />
        {suffix && (
          <span className="text-sm text-muted-foreground">{suffix}</span>
        )}
      </div>
    </div>
  )
}

export const numberDef: QuestionDef<NumberQuestion> = {
  type: "NUMBER",
  category: "text",
  label: "数字输入",
  icon: Hash,
  defaultQuestion: (order) => ({
    id: nanoid(),
    type: "NUMBER",
    title: "数字输入题",
    required: false,
    order,
    config: {
      placeholder: "请输入",
      min: 0,
      max: 100,
      step: 1,
    },
  }),
  Canvas: ({ question }) => {
    const { placeholder, prefix, suffix, min, max, step = 1 } = question.config

    return (
      <div className="flex items-center gap-2">
        {prefix && (
          <span className="text-sm text-muted-foreground">{prefix}</span>
        )}
        <Input
          type="number"
          placeholder={placeholder || "请输入数字"}
          min={min}
          max={max}
          step={step}
          className="h-10 flex-1 text-sm"
        />
        {suffix && (
          <span className="text-sm text-muted-foreground">{suffix}</span>
        )}
      </div>
    )
  },
  Editor: ({ question, onChange, onSave }) => {
    const { placeholder, min, max, prefix, suffix } = question.config

    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">占位文字</Label>
          <UIInput
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

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">最小值</Label>
            <UIInput
              type="number"
              value={min ?? ""}
              onChange={(e) =>
                onChange({
                  ...question,
                  config: {
                    ...question.config,
                    min: e.target.value
                      ? parseFloat(e.target.value)
                      : undefined,
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
            <Label className="text-xs text-muted-foreground">最大值</Label>
            <UIInput
              type="number"
              value={max ?? ""}
              onChange={(e) =>
                onChange({
                  ...question,
                  config: {
                    ...question.config,
                    max: e.target.value
                      ? parseFloat(e.target.value)
                      : undefined,
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
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">前缀</Label>
            <UIInput
              value={prefix || ""}
              onChange={(e) =>
                onChange({
                  ...question,
                  config: { ...question.config, prefix: e.target.value },
                })
              }
              onBlur={() => {
                const updated = { ...question }
                onSave?.(updated)
              }}
              className="h-8"
              placeholder="¥"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">后缀</Label>
            <UIInput
              value={suffix || ""}
              onChange={(e) =>
                onChange({
                  ...question,
                  config: { ...question.config, suffix: e.target.value },
                })
              }
              onBlur={() => {
                const updated = { ...question }
                onSave?.(updated)
              }}
              className="h-8"
              placeholder="元"
            />
          </div>
        </div>
      </div>
    )
  },
  QuestionCard,
  Response: ({ question, order, showNumber = true, value, onChange }) => {
    const { placeholder, prefix, suffix, min, max, step = 1 } = question.config

    return (
      <div className="relative px-3 py-3">
        <QuestionTitleReadonly
          order={order}
          showNumber={showNumber}
          title={question.title}
          description={question.description}
          required={question.required}
        />
        <div className="mt-3 flex items-center gap-2">
          {prefix && (
            <span className="text-sm text-muted-foreground">{prefix}</span>
          )}
          <Input
            type="number"
            value={(value as number) ?? ""}
            onChange={(e) =>
              onChange?.(
                e.target.value ? parseFloat(e.target.value) : undefined
              )
            }
            placeholder={placeholder || "请输入数字"}
            min={min}
            max={max}
            step={step}
            className="h-10 flex-1 text-sm"
          />
          {suffix && (
            <span className="text-sm text-muted-foreground">{suffix}</span>
          )}
        </div>
      </div>
    )
  },
}
