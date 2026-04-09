import { Target } from "lucide-react"
import { nanoid } from "nanoid"
import { useState } from "react"
import { cn } from "@/lib/utils"
import type { QuestionDef, CESQuestion } from "@/lib/questions/types"
import { QuestionTitle } from "@/components/questions/question-title"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

function QuestionCard({
  question,
  order,
  showNumber = true,
  onTitleChange,
  onTitleBlur,
  onDescriptionChange,
  onDescriptionBlur,
}: {
  question: CESQuestion
  order: number
  showNumber?: boolean
  onUpdate?: (question: CESQuestion) => void
  onTitleChange?: (title: string) => void
  onTitleBlur?: (title: string) => void
  onDescriptionChange?: (description: string) => void
  onDescriptionBlur?: (description: string) => void
}) {
  const {
    max = 5,
    lowLabel = "非常困难",
    highLabel = "非常容易",
  } = question.config
  const [selected, setSelected] = useState<number | null>(null)

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

      <div className="mt-4">
        <div className="grid grid-cols-5 gap-2">
          {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
            <div
              key={n}
              onClick={() => setSelected(n)}
              className={cn(
                "cursor-pointer rounded-md border px-4 py-3 text-center text-sm font-medium transition-colors",
                selected === n
                  ? "border-primary bg-primary text-primary-foreground"
                  : "hover:border-primary"
              )}
            >
              {n}
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-between text-xs text-muted-foreground">
          <span>{lowLabel}</span>
          <span>{highLabel}</span>
        </div>
      </div>
    </div>
  )
}

export const cesDef: QuestionDef<CESQuestion> = {
  type: "CES",
  category: "advanced",
  label: "费力度 (CES)",
  icon: Target,
  defaultQuestion: (order) => ({
    id: nanoid(),
    type: "CES",
    title: "您解决这个问题有多困难？",
    required: false,
    order,
    config: {
      min: 1,
      max: 5,
      lowLabel: "非常困难",
      highLabel: "非常容易",
    },
  }),
  Canvas: ({ question }) => {
    const {
      max = 5,
      lowLabel = "非常困难",
      highLabel = "非常容易",
    } = question.config
    const [selected, setSelected] = useState<number | null>(null)

    return (
      <>
        <div className="mt-4">
          <div className="grid grid-cols-5 gap-2">
            {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setSelected(n)}
                className={cn(
                  "rounded-md border px-4 py-3 text-sm font-medium transition-colors",
                  selected === n
                    ? "border-primary bg-primary text-primary-foreground"
                    : "hover:border-primary"
                )}
              >
                {n}
              </button>
            ))}
          </div>
          <div className="mt-2 flex justify-between text-xs text-muted-foreground">
            <span>{lowLabel}</span>
            <span>{highLabel}</span>
          </div>
        </div>
      </>
    )
  },
  Editor: ({ question, onChange, onSave }) => {
    const {
      max = 5,
      lowLabel = "非常困难",
      highLabel = "非常容易",
    } = question.config

    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">量表数量</Label>
          <Input
            type="number"
            min={3}
            max={10}
            value={max}
            onChange={(e) =>
              onChange({
                ...question,
                config: {
                  ...question.config,
                  max: parseInt(e.target.value) || 5,
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

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">低端标签</Label>
            <Input
              value={lowLabel}
              onChange={(e) =>
                onChange({
                  ...question,
                  config: { ...question.config, lowLabel: e.target.value },
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
            <Label className="text-xs text-muted-foreground">高端标签</Label>
            <Input
              value={highLabel}
              onChange={(e) =>
                onChange({
                  ...question,
                  config: { ...question.config, highLabel: e.target.value },
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
      </div>
    )
  },
  QuestionCard,
}
