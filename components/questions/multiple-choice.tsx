import { CheckSquare } from "lucide-react"
import { nanoid } from "nanoid"
import { useState } from "react"
import { cn } from "@/lib/utils"
import type { QuestionDef, MultipleChoiceQuestion } from "@/lib/questions/types"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { PlusCircle, Trash2 } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { QuestionTitle } from "@/components/questions/question-title"
import { QuestionTitleReadonly } from "@/components/questions/question-title-readonly"

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
  question: MultipleChoiceQuestion
  order: number
  showNumber?: boolean
  onUpdate?: (question: MultipleChoiceQuestion) => void
  onTitleChange?: (title: string) => void
  onTitleBlur?: (title: string) => void
  onDescriptionChange?: (description: string) => void
  onDescriptionBlur?: (description: string) => void
  onOptionChange?: (question: MultipleChoiceQuestion) => void
}) {
  const { options, columns = 1 } = question.config
  const [editingOptId, setEditingOptId] = useState<string | null>(null)

  const handleOptClick = (optId: string) => {
    setEditingOptId(optId)
  }

  const handleOptUpdate = (
    optId: string,
    label: string,
    shouldSave = false
  ) => {
    const updatedOptions = options.map((o) =>
      o.id === optId ? { ...o, label } : o
    )
    const updatedQuestion = {
      ...question,
      config: {
        ...question.config,
        options: updatedOptions,
      },
    }
    if (shouldSave && onUpdate) {
      onUpdate(updatedQuestion)
    } else if (onOptionChange) {
      onOptionChange(updatedQuestion)
    }
  }

  return (
    <div className="relative px-3 py-4">
      <div className="absolute -top-2 left-6 z-10 rounded-t-none rounded-b bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
        多选题
      </div>

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
        <div
          className="grid gap-2"
          style={{
            gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
          }}
        >
          {options.map((opt) => (
            <div
              key={opt.id}
              className={cn(
                "relative flex items-center gap-3 rounded-lg border bg-card p-3 text-sm transition-all duration-200",
                editingOptId === opt.id &&
                  "border-primary shadow-sm ring-1 ring-primary",
                editingOptId !== opt.id && "hover:shadow-sm"
              )}
              onClick={() => handleOptClick(opt.id)}
            >
              {/* 固定边框容器，避免边框变化导致抖动 */}
              <div className="pointer-events-none absolute inset-0 z-10 rounded-lg border-2 border-transparent" />

              {/* 方形复选框 - 仅作为视觉标识 */}
              <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border border-primary/50" />

              {editingOptId === opt.id ? (
                <input
                  autoFocus
                  type="text"
                  className="flex-1 bg-transparent text-sm font-medium outline-none"
                  value={opt.label}
                  onChange={(e) =>
                    handleOptUpdate(opt.id, e.target.value, false)
                  }
                  onClick={(e) => e.stopPropagation()}
                  onBlur={(e) => {
                    handleOptUpdate(opt.id, e.target.value, true)
                    setEditingOptId(null)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      handleOptUpdate(opt.id, e.currentTarget.value, true)
                      setEditingOptId(null)
                    }
                  }}
                />
              ) : (
                <span className="truncate font-medium">{opt.label}</span>
              )}

              {editingOptId === opt.id && (
                <div className="absolute -top-7 left-0 z-20 flex items-center gap-2 rounded border bg-background px-2 py-1 text-xs text-muted-foreground shadow-sm">
                  <span>编辑选项</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export const multipleChoiceDef: QuestionDef<MultipleChoiceQuestion> = {
  type: "MULTIPLE_CHOICE",
  category: "choice",
  label: "多选题",
  icon: CheckSquare,
  defaultQuestion: (order) => ({
    id: nanoid(),
    type: "MULTIPLE_CHOICE",
    title: "新问题",
    required: false,
    order,
    config: {
      options: [
        { id: nanoid(), label: "选项 1" },
        { id: nanoid(), label: "选项 2" },
      ],
      columns: 1,
    },
  }),
  Canvas: ({ question, onUpdate }) => {
    const { options, columns = 1 } = question.config
    const [editingOptId, setEditingOptId] = useState<string | null>(null)

    const handleOptClick = (optId: string) => {
      setEditingOptId(optId)
    }

    const handleOptUpdate = (optId: string, label: string) => {
      if (!onUpdate) return
      const updatedOptions = options.map((o) =>
        o.id === optId ? { ...o, label } : o
      )
      onUpdate({
        ...question,
        config: {
          ...question.config,
          options: updatedOptions,
        },
      })
    }

    return (
      <div className="relative">
        <div className="absolute -top-2.5 left-0 z-10 rounded bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
          多选题
        </div>
        <div
          className="grid gap-2 pt-4"
          style={{
            gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
          }}
        >
          {options.map((opt) => (
            <div
              key={opt.id}
              className={cn(
                "relative flex items-center gap-3 rounded-lg border bg-card p-3 text-sm transition-all duration-200",
                editingOptId === opt.id &&
                  "border-primary shadow-sm ring-1 ring-primary",
                editingOptId !== opt.id && "hover:shadow-sm"
              )}
              onClick={() => handleOptClick(opt.id)}
            >
              {/* 固定边框容器，避免边框变化导致抖动 */}
              <div className="pointer-events-none absolute inset-0 z-10 rounded-lg border-2 border-transparent" />

              {/* 方形复选框 - 仅作为视觉标识 */}
              <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border border-primary/50" />

              {editingOptId === opt.id ? (
                <input
                  autoFocus
                  type="text"
                  className="flex-1 bg-transparent text-sm font-medium outline-none"
                  value={opt.label}
                  onChange={(e) => handleOptUpdate(opt.id, e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  onBlur={() => setEditingOptId(null)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      setEditingOptId(null)
                    }
                  }}
                />
              ) : (
                <span className="truncate font-medium">{opt.label}</span>
              )}

              {editingOptId === opt.id && (
                <div className="absolute -top-7 left-0 z-20 flex items-center gap-2 rounded border bg-background px-2 py-1 text-xs text-muted-foreground shadow-sm">
                  <span>编辑选项</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  },
  Editor: ({ question, onChange, onSave }) => {
    const { options, columns = 1 } = question.config

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
      onSave?.({
        ...question,
        config: {
          ...question.config,
          options: [
            ...options,
            { id: nanoid(), label: `选项${options.length + 1}` },
          ],
        },
      })
    }

    function removeOption(id: string) {
      if (options.length <= 1) return
      onChange({
        ...question,
        config: {
          ...question.config,
          options: options.filter((o) => o.id !== id),
        },
      })
    }

    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">每行选项数</Label>
          <Select
            value={columns.toString()}
            onValueChange={(value) => {
              const updated = {
                ...question,
                config: { ...question.config, columns: parseInt(value) },
              }
              onChange(updated)
              onSave?.(updated)
            }}
          >
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4].map((num) => (
                <SelectItem key={num} value={num.toString()}>
                  {num} 列
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">选项</Label>
            {options.map((opt) => (
              <div key={opt.id} className="flex items-center gap-2">
                <div className="h-3.5 w-3.5 shrink-0 rounded-sm border border-border" />
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
      </div>
    )
  },
  QuestionCard,
  Response: ({ question, order, showNumber = true, value, onChange }) => {
    const { options, columns = 1 } = question.config
    const selectedValues = (value as string[]) || []

    const toggleOption = (label: string) => {
      if (selectedValues.includes(label)) {
        onChange(selectedValues.filter((v) => v !== label))
      } else {
        onChange([...selectedValues, label])
      }
    }

    return (
      <div className="relative px-3 py-3">
        <QuestionTitleReadonly
          order={order}
          showNumber={showNumber}
          title={question.title}
          description={question.description}
          required={question.required}
        />

        <div className="relative mt-3">
          <div
            className="grid gap-2"
            style={{
              gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
            }}
          >
            {options.map((opt) => {
              const isSelected = selectedValues.includes(opt.label)
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => toggleOption(opt.label)}
                  className={cn(
                    "relative flex items-center gap-3 rounded-lg border p-3 text-left text-sm transition-all duration-200",
                    isSelected
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border bg-card hover:border-primary/50 hover:shadow-sm"
                  )}
                >
                  <div
                    className={cn(
                      "flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border transition-colors",
                      isSelected
                        ? "border-primary bg-primary"
                        : "border-primary/50"
                    )}
                  >
                    {isSelected && (
                      <svg
                        className="h-3 w-3 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={3}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </div>
                  <span className="truncate font-medium">{opt.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    )
  },
}
