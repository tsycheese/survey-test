import { Star } from "lucide-react"
import { nanoid } from "nanoid"
import { useState } from "react"
import type { QuestionDef, RatingQuestion } from "@/lib/questions/types"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

function QuestionCard({
  question,
  order,
  showNumber = true,
  onTitleChange,
}: {
  question: RatingQuestion
  order: number
  showNumber?: boolean
  onTitleChange?: (title: string) => void
}) {
  const [editingTitle, setEditingTitle] = useState(false)

  const handleTitleChange = (title: string) => {
    if (onTitleChange) {
      onTitleChange(title)
    }
  }

  return (
    <div className="relative px-3 py-3">
      <div className="relative flex items-start justify-between gap-2">
        <div className="flex flex-1 items-start">
          {showNumber && (
            <span className="mt-1 mr-2 text-sm font-medium text-muted-foreground">
              {order}.
            </span>
          )}
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
        <div className="mt-2 flex items-center gap-1">
          {Array.from({ length: question.config.max }, (_, i) => (
            <Star key={i} className="h-4 w-4 text-muted-foreground" />
          ))}
          {question.config.minLabel && (
            <span className="ml-2 text-xs text-muted-foreground">
              {question.config.minLabel}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export const ratingDef: QuestionDef<RatingQuestion> = {
  type: "RATING",
  label: "评分题",
  icon: Star,
  defaultQuestion: (order) => ({
    id: nanoid(),
    type: "RATING",
    title: "新问题",
    required: false,
    order,
    config: {
      min: 1,
      max: 5,
      minLabel: "",
      maxLabel: "",
    },
  }),
  Canvas: ({ question }) => (
    <div className="mt-2 flex items-center gap-1">
      {Array.from({ length: question.config.max }, (_, i) => (
        <Star key={i} className="h-4 w-4 text-muted-foreground" />
      ))}
      {question.config.minLabel && (
        <span className="ml-2 text-xs text-muted-foreground">
          {question.config.minLabel}
        </span>
      )}
    </div>
  ),
  Editor: ({ question, onChange }) => {
    const { config } = question

    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">最大分值</Label>
          <div className="flex gap-2">
            {[3, 5, 7, 10].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() =>
                  onChange({ ...question, config: { ...config, max: n } })
                }
                className={[
                  "flex-1 rounded border py-1 text-sm transition-colors",
                  config.max === n
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:border-primary/50",
                ].join(" ")}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">最低分标签</Label>
          <Input
            value={config.minLabel ?? ""}
            onChange={(e) =>
              onChange({
                ...question,
                config: { ...config, minLabel: e.target.value },
              })
            }
            placeholder="如：非常不满意"
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">最高分标签</Label>
          <Input
            value={config.maxLabel ?? ""}
            onChange={(e) =>
              onChange({
                ...question,
                config: { ...config, maxLabel: e.target.value },
              })
            }
            placeholder="如：非常满意"
            className="h-8 text-sm"
          />
        </div>
      </div>
    )
  },
  QuestionCard,
}
