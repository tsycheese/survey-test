import { User } from "lucide-react"
import { nanoid } from "nanoid"
import { useState } from "react"
import type { QuestionDef, GenderQuestion } from "@/lib/questions/types"
import { Label } from "@/components/ui/label"
import { QuestionTitle } from "@/components/questions/question-title"
import { QuestionTitleReadonly } from "@/components/questions/question-title-readonly"
import { cn } from "@/lib/utils"

function QuestionCard({
  question,
  order,
  showNumber = true,
  onTitleChange,
  onTitleBlur,
  onDescriptionChange,
  onDescriptionBlur,
}: {
  question: GenderQuestion
  order: number
  showNumber?: boolean
  onTitleChange?: (title: string) => void
  onTitleBlur?: (title: string) => void
  onDescriptionChange?: (description: string) => void
  onDescriptionBlur?: (description: string) => void
}) {
  const { options = [] } = question.config

  const defaultOptions =
    options.length > 0
      ? options
      : [
          { id: "male", label: "男" },
          { id: "female", label: "女" },
          { id: "other", label: "其他" },
        ]

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

      <div className="mt-3 space-y-2">
        {defaultOptions.map((opt) => (
          <div
            key={opt.id}
            className="flex items-center gap-3 rounded-lg border bg-card p-3 text-sm hover:bg-muted/50"
          >
            <div className="h-4 w-4 shrink-0 rounded-full border border-primary/50" />
            <span className="font-medium">{opt.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export const genderDef: QuestionDef<GenderQuestion> = {
  type: "GENDER",
  category: "info",
  label: "性别选择",
  icon: User,
  defaultQuestion: (order) => ({
    id: nanoid(),
    type: "GENDER",
    title: "新问题",
    required: false,
    order,
    config: {
      options: [
        { id: "male", label: "男" },
        { id: "female", label: "女" },
        { id: "other", label: "其他" },
      ],
    },
  }),
  Canvas: ({ question }) => {
    const { options = [] } = question.config

    const defaultOptions =
      options.length > 0
        ? options
        : [
            { id: "male", label: "男" },
            { id: "female", label: "女" },
            { id: "other", label: "其他" },
          ]

    return (
      <div className="mt-3 space-y-2">
        {defaultOptions.map((opt) => (
          <div
            key={opt.id}
            className="flex items-center gap-3 rounded-lg border bg-card p-3 text-sm hover:bg-muted/50"
          >
            <div className="h-4 w-4 shrink-0 rounded-full border border-primary/50" />
            <span className="font-medium">{opt.label}</span>
          </div>
        ))}
      </div>
    )
  },
  Editor: ({ question }) => {
    const { options = [] } = question.config

    const defaultOptions =
      options.length > 0
        ? options
        : [
            { id: "male", label: "男" },
            { id: "female", label: "女" },
            { id: "other", label: "其他" },
          ]

    return (
      <div className="space-y-4">
        <div className="rounded-md border bg-muted p-3 text-sm text-muted-foreground">
          <p>性别选择题的选项已固定，不支持自定义修改。</p>
          <p className="mt-1 text-xs">默认选项：男、女、其他</p>
        </div>
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">当前选项</Label>
          {defaultOptions.map((opt) => (
            <div
              key={opt.id}
              className="flex items-center gap-3 rounded-lg border bg-card p-3 text-sm"
            >
              <div className="h-4 w-4 shrink-0 rounded-full border border-border" />
              <span className="flex-1 font-medium text-muted-foreground">
                {opt.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    )
  },
  QuestionCard,
  Response: ({ question, order, showNumber = true, value, onChange }) => {
    const { options = [] } = question.config

    const defaultOptions =
      options.length > 0
        ? options
        : [
            { id: "male", label: "男" },
            { id: "female", label: "女" },
            { id: "other", label: "其他" },
          ]

    return (
      <div className="relative px-3 py-3">
        <QuestionTitleReadonly
          order={order}
          showNumber={showNumber}
          title={question.title}
          description={question.description}
          required={question.required}
        />
        <div className="mt-3 space-y-2">
          {defaultOptions.map((opt) => (
            <label
              key={opt.id}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-lg border bg-card p-3 text-sm transition-colors",
                value === opt.id
                  ? "border-primary bg-primary/5"
                  : "hover:bg-muted/50"
              )}
            >
              <div
                className={cn(
                  "h-4 w-4 shrink-0 rounded-full border",
                  value === opt.id
                    ? "border-primary bg-primary"
                    : "border-primary/50"
                )}
              />
              <input
                type="radio"
                name={`gender-${question.id}`}
                value={opt.id}
                checked={value === opt.id}
                onChange={() => onChange?.(opt.id)}
                className="sr-only"
              />
              <span className="font-medium">{opt.label}</span>
            </label>
          ))}
        </div>
      </div>
    )
  },
}
