import { AlignLeft } from "lucide-react"
import { nanoid } from "nanoid"
import { useState } from "react"
import type { QuestionDef, TextQuestion } from "@/lib/questions/types"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

function QuestionCard({
  question,
  order,
  onTitleChange,
}: {
  question: TextQuestion
  order: number
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
        {question.config.multiline ? (
          <div className="h-16 rounded border border-dashed border-border bg-muted/30" />
        ) : (
          <div className="h-8 rounded border border-dashed border-border bg-muted/30" />
        )}
      </div>
    </div>
  )
}

export const textDef: QuestionDef<TextQuestion> = {
  type: "TEXT",
  label: "文本填空",
  icon: AlignLeft,
  defaultQuestion: (order) => ({
    id: nanoid(),
    type: "TEXT",
    title: "新问题",
    required: false,
    order,
    config: {
      placeholder: "",
      multiline: false,
    },
  }),
  Canvas: ({ question }) => (
    <div className="mt-1">
      {question.config.multiline ? (
        <div className="h-16 rounded border border-dashed border-border bg-muted/30" />
      ) : (
        <div className="h-8 rounded border border-dashed border-border bg-muted/30" />
      )}
    </div>
  ),
  Editor: ({ question, onChange }) => {
    const { config } = question

    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">占位提示文字</Label>
          <Input
            value={config.placeholder ?? ""}
            onChange={(e) =>
              onChange({
                ...question,
                config: { ...config, placeholder: e.target.value },
              })
            }
            placeholder="请输入..."
            className="h-8 text-sm"
          />
        </div>
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">多行输入</Label>
          <button
            type="button"
            role="switch"
            aria-checked={config.multiline}
            onClick={() =>
              onChange({
                ...question,
                config: { ...config, multiline: !config.multiline },
              })
            }
            className={[
              "relative h-5 w-9 rounded-full transition-colors",
              config.multiline ? "bg-primary" : "bg-muted",
            ].join(" ")}
          >
            <span
              className={[
                "absolute top-0.5 h-4 w-4 rounded-full bg-background shadow transition-transform",
                config.multiline ? "translate-x-4" : "translate-x-0.5",
              ].join(" ")}
            />
          </button>
        </div>
      </div>
    )
  },
  QuestionCard,
}
