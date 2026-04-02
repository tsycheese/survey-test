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

function QuestionCard({
  question,
  order,
  onUpdate,
  onTitleChange,
}: {
  question: MultipleChoiceQuestion
  order: number
  onUpdate?: (question: MultipleChoiceQuestion) => void
  onTitleChange?: (title: string) => void
}) {
  const [editingTitle, setEditingTitle] = useState(false)
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

  const handleTitleChange = (title: string) => {
    if (onTitleChange) {
      onTitleChange(title)
    }
  }

  return (
    <div className="relative px-3 py-4">
      <div className="absolute -top-2 left-6 z-10 rounded-t-none rounded-b bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
        多选题
      </div>

      <div className="relative flex items-start justify-between gap-2 pt-2">
        <div className="flex flex-1 items-start">
          <span className="mt-1 mr-2 text-sm font-medium text-muted-foreground">
            {order}.
          </span>
          <div className="flex-1 overflow-hidden">
            {editingTitle ? (
              <textarea
                autoFocus
                rows={1}
                className="block w-full resize-none overflow-hidden rounded-sm border-2 border-primary bg-transparent px-2 py-1 text-sm leading-6 font-medium shadow-none ring-0 outline-none focus-visible:ring-0"
                style={{ minHeight: "36px" }}
                value={question.title}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    setEditingTitle(false)
                  }
                }}
                onChange={(e) => {
                  const target = e.target as HTMLTextAreaElement
                  target.style.height = "auto"
                  target.style.height = `${Math.max(target.scrollHeight, 36)}px`
                  handleTitleChange(target.value)
                }}
                onBlur={() => setEditingTitle(false)}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <div
                onClick={(e) => {
                  e.stopPropagation()
                  setEditingTitle(true)
                }}
                className="group/title relative block w-full cursor-text rounded-sm border-2 border-transparent px-2 py-1 text-sm leading-6 font-medium break-all hover:border-dashed hover:border-border"
                style={{ minHeight: "36px" }}
              >
                {question.title || "请输入题目标题"}
                {question.required && (
                  <span className="ml-1 text-red-500">*</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

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
    </div>
  )
}

export const multipleChoiceDef: QuestionDef<MultipleChoiceQuestion> = {
  type: "MULTIPLE_CHOICE",
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
  Editor: ({ question, onChange }) => {
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
      onChange({
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
            onValueChange={(value) =>
              onChange({
                ...question,
                config: { ...question.config, columns: parseInt(value) },
              })
            }
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
                  className="h-8 border-none bg-transparent px-0 text-sm focus-visible:ring-0"
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
}
