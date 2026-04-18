import { Gauge } from "lucide-react"
import { nanoid } from "nanoid"
import { useRef, useState } from "react"
import { cn } from "@/lib/utils"
import type { QuestionDef, NPSQuestion } from "@/lib/questions/types"
import { QuestionTitle } from "@/components/questions/question-title"
import { QuestionTitleReadonly } from "@/components/questions/question-title-readonly"
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
  onFocusQuestion,
}: {
  question: NPSQuestion
  order: number
  showNumber?: boolean
  onUpdate?: (question: NPSQuestion) => void
  onTitleChange?: (title: string) => void
  onTitleBlur?: (title: string) => void
  onDescriptionChange?: (description: string) => void
  onDescriptionBlur?: (description: string) => void
  onFocusQuestion?: () => void
}) {
  const {
    max = 10,
    lowLabel = "极不推荐",
    highLabel = "极推荐",
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
        onFocusQuestion={onFocusQuestion}
      />

      <div className="mt-4">
        <div className="grid grid-cols-11 gap-1">
          {Array.from({ length: max + 1 }, (_, i) => i).map((n) => (
            <div
              key={n}
              onClick={() => setSelected(n)}
              className={cn(
                "flex h-10 cursor-pointer items-center justify-center rounded-md border text-sm font-medium transition-colors",
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

export const npsDef: QuestionDef<NPSQuestion> = {
  type: "NPS",
  category: "advanced",
  label: "NPS 评分",
  icon: Gauge,
  defaultQuestion: (order) => ({
    id: nanoid(),
    type: "NPS",
    title: "您有多大可能向朋友或同事推荐我们的产品或服务？",
    required: false,
    order,
    config: {
      min: 0,
      max: 10,
      lowLabel: "极不推荐",
      highLabel: "极推荐",
    },
  }),
  Canvas: ({ question, onUpdate }) => {
    const {
      max = 10,
      lowLabel = "极不推荐",
      highLabel = "极推荐",
    } = question.config
    const [selected, setSelected] = useState<number | null>(null)

    return (
      <>
        <div className="mt-4">
          <div className="grid grid-cols-11 gap-1">
            {Array.from({ length: max + 1 }, (_, i) => i).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => {
                  setSelected(n)
                  onUpdate?.({ ...question })
                }}
                className={cn(
                  "aspect-square rounded-md border text-sm font-medium transition-colors",
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
      max = 10,
      lowLabel = "极不推荐",
      highLabel = "极推荐",
    } = question.config
    const originalValuesRef = useRef<Map<string, string | number | undefined>>(
      new Map()
    )

    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">最大值</Label>
          <Input
            type="number"
            value={max}
            onChange={(e) =>
              onChange({
                ...question,
                config: {
                  ...question.config,
                  max: parseInt(e.target.value) || 10,
                },
              })
            }
            onFocus={() => {
              originalValuesRef.current.set("max", question.config.max)
            }}
            onBlur={(e) => {
              const newMax = parseInt(e.target.value) || 10
              const original = originalValuesRef.current.get("max")
              if (newMax !== original) {
                const updated = { ...question }
                onSave?.(updated)
              }
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
              onFocus={() => {
                originalValuesRef.current.set(
                  "lowLabel",
                  question.config.lowLabel
                )
              }}
              onBlur={(e) => {
                const original = originalValuesRef.current.get("lowLabel")
                if (e.target.value !== original) {
                  const updated = { ...question }
                  onSave?.(updated)
                }
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
              onFocus={() => {
                originalValuesRef.current.set(
                  "highLabel",
                  question.config.highLabel
                )
              }}
              onBlur={(e) => {
                const original = originalValuesRef.current.get("highLabel")
                if (e.target.value !== original) {
                  const updated = { ...question }
                  onSave?.(updated)
                }
              }}
              className="h-8"
            />
          </div>
        </div>
      </div>
    )
  },
  QuestionCard,
  Response: ({ question, order, showNumber = true, value, onChange }) => {
    const {
      max = 10,
      lowLabel = "极不推荐",
      highLabel = "极推荐",
    } = question.config
    const currentValue = (value as number) ?? null

    const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange?.(parseInt(e.target.value))
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
        {/* 桌面端：按钮网格 */}
        <div className="mt-4 hidden md:block">
          <div className="grid grid-cols-11 gap-1">
            {Array.from({ length: max + 1 }, (_, i) => i).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => onChange?.(n)}
                className={cn(
                  "flex h-10 items-center justify-center rounded-md border text-sm font-medium transition-colors",
                  currentValue === n
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
        {/* 移动端：滑块 */}
        <div className="mt-6 md:hidden">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>0</span>
            <span className="text-lg font-semibold text-foreground">
              {currentValue ?? "-"}
            </span>
            <span>{max}</span>
          </div>
          <div className="relative mt-2">
            <input
              type="range"
              min={0}
              max={max}
              value={currentValue ?? 5}
              onChange={handleSliderChange}
              className="h-2 w-full cursor-pointer rounded-lg"
              style={{
                background:
                  currentValue !== null
                    ? `linear-gradient(to right, hsl(var(--primary)) 0%, hsl(var(--primary)) ${(currentValue / max) * 100}%, hsl(var(--muted)) ${(currentValue / max) * 100}%, hsl(var(--muted)) 100%)`
                    : `hsl(var(--muted))`,
              }}
            />
          </div>
          <div className="mt-3 flex justify-between text-xs text-muted-foreground">
            <span>{lowLabel}</span>
            <span>{highLabel}</span>
          </div>
        </div>
      </div>
    )
  },
}
