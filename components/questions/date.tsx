import { Calendar } from "lucide-react"
import { nanoid } from "nanoid"
import type { QuestionDef, DateQuestion } from "@/lib/questions/types"
import { Input } from "@/components/ui/input"
import { QuestionTitle } from "@/components/questions/question-title"
import { Label } from "@/components/ui/label"
import { Input as UIInput } from "@/components/ui/input"

function QuestionCard({
  question,
  order,
  showNumber = true,
  onTitleChange,
  onTitleBlur,
}: {
  question: DateQuestion
  order: number
  showNumber?: boolean
  onUpdate?: (question: DateQuestion) => void
  onTitleChange?: (title: string) => void
  onTitleBlur?: (title: string) => void
}) {
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

      <Input type="date" className="mt-3" disabled />
    </div>
  )
}

export const dateDef: QuestionDef<DateQuestion> = {
  type: "DATE",
  category: "datetime",
  label: "日期选择",
  icon: Calendar,
  defaultQuestion: (order) => ({
    id: nanoid(),
    type: "DATE",
    title: "请选择日期",
    required: false,
    order,
    config: {
      format: "YYYY-MM-DD",
    },
  }),
  Canvas: ({ question }) => {
    const { minDate, maxDate } = question.config

    return <Input type="date" min={minDate} max={maxDate} className="w-full" />
  },
  Editor: ({ question, onChange, onSave }) => {
    const { minDate, maxDate } = question.config

    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">最小日期</Label>
          <UIInput
            type="date"
            value={minDate || ""}
            onChange={(e) =>
              onChange({
                ...question,
                config: { ...question.config, minDate: e.target.value },
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
          <Label className="text-xs text-muted-foreground">最大日期</Label>
          <UIInput
            type="date"
            value={maxDate || ""}
            onChange={(e) =>
              onChange({
                ...question,
                config: { ...question.config, maxDate: e.target.value },
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
    )
  },
  QuestionCard,
}
