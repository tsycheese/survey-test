import { CircleDot } from "lucide-react"
import { nanoid } from "nanoid"
import { useState } from "react"
import type { QuestionDef, DropdownQuestion } from "@/lib/questions/types"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { PlusCircle, Trash2 } from "lucide-react"
import { QuestionTitle } from "@/components/questions/question-title"

function QuestionCard({
  question,
  order,
  showNumber = true,
  onUpdate,
  onTitleChange,
  onTitleBlur,
  onDescriptionChange,
  onDescriptionBlur,
  onOptionChange,
}: {
  question: DropdownQuestion
  order: number
  showNumber?: boolean
  onUpdate?: (question: DropdownQuestion) => void
  onTitleChange?: (title: string) => void
  onTitleBlur?: (title: string) => void
  onDescriptionChange?: (description: string) => void
  onDescriptionBlur?: (description: string) => void
  onOptionChange?: (question: DropdownQuestion) => void
}) {
  const { options } = question.config

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

      <div className="relative mt-3">
        <div className="flex items-center gap-2 rounded-lg border bg-card p-3 text-sm text-muted-foreground">
          <span>下拉选择</span>
          <span className="flex-1 border-l pl-2">{options.length} 个选项</span>
        </div>
      </div>
    </div>
  )
}

export const dropdownDef: QuestionDef<DropdownQuestion> = {
  type: "DROPDOWN",
  category: "choice",
  label: "下拉选择",
  icon: CircleDot,
  defaultQuestion: (order) => ({
    id: nanoid(),
    type: "DROPDOWN",
    title: "下拉选择题",
    required: false,
    order,
    config: {
      options: [
        { id: nanoid(), label: "选项 1" },
        { id: nanoid(), label: "选项 2" },
        { id: nanoid(), label: "选项 3" },
      ],
      placeholder: "请选择",
    },
  }),
  Canvas: ({ question }) => {
    const { options, placeholder = "请选择" } = question.config

    return (
      <select className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary">
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt.id} value={opt.label}>
            {opt.label}
          </option>
        ))}
      </select>
    )
  },
  Editor: ({ question, onChange, onSave }) => {
    const { options } = question.config

    function updateOption(id: string, label: string) {
      onChange({
        ...question,
        config: {
          ...question.config,
          options: options.map((o) => (o.id === id ? { ...o, label } : o)),
        },
      })
    }

    function addOption() {
      const updated = {
        ...question,
        config: {
          ...question.config,
          options: [
            ...options,
            { id: nanoid(), label: `选项${options.length + 1}` },
          ],
        },
      }
      onChange(updated)
      onSave?.(updated)
    }

    function removeOption(id: string) {
      if (options.length <= 1) return
      const updated = {
        ...question,
        config: {
          ...question.config,
          options: options.filter((o) => o.id !== id),
        },
      }
      onChange(updated)
      onSave?.(updated)
    }

    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs text-muted-foreground">选项</label>
          </div>
          {options.map((opt) => (
            <div key={opt.id} className="flex items-center gap-2">
              <div className="h-3.5 w-3.5 shrink-0 rounded-full border border-border" />
              <Input
                value={opt.label}
                onChange={(e) => updateOption(opt.id, e.target.value)}
                onBlur={() => {
                  const updated = {
                    ...question,
                    config: {
                      ...question.config,
                      options: [...options],
                    },
                  }
                  onSave?.(updated)
                }}
                className="h-8 border-none bg-transparent px-0 text-sm focus-visible:ring-0 dark:bg-transparent"
                placeholder="选项内容"
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => removeOption(opt.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={addOption}
            className="w-full"
          >
            <PlusCircle className="mr-1.5 h-3.5 w-3.5" />
            添加选项
          </Button>
        </div>
      </div>
    )
  },
  QuestionCard,
}
