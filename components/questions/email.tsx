import { Mail } from "lucide-react"
import { nanoid } from "nanoid"
import type { QuestionDef, EmailQuestion } from "@/lib/questions/types"
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
  onFocusQuestion,
}: {
  question: EmailQuestion
  order: number
  showNumber?: boolean
  onUpdate?: (question: EmailQuestion) => void
  onTitleChange?: (title: string) => void
  onTitleBlur?: (title: string) => void
  onDescriptionChange?: (description: string) => void
  onDescriptionBlur?: (description: string) => void
  onFocusQuestion?: () => void
}) {
  const { placeholder = "请输入邮箱地址" } = question.config

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

      <Input type="email" placeholder={placeholder} className="mt-3" disabled />
    </div>
  )
}

export const emailDef: QuestionDef<EmailQuestion> = {
  type: "EMAIL",
  category: "contact",
  label: "邮箱",
  icon: Mail,
  defaultQuestion: (order) => ({
    id: nanoid(),
    type: "EMAIL",
    title: "您的邮箱地址是？",
    required: false,
    order,
    config: {
      placeholder: "请输入邮箱地址",
    },
  }),
  Canvas: ({ question }) => {
    const { placeholder = "请输入邮箱地址" } = question.config

    return <Input type="email" placeholder={placeholder} className="w-full" />
  },
  Editor: ({ question, onChange, onSave }) => {
    const { placeholder = "请输入邮箱地址" } = question.config

    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">占位文字</Label>
          <UIInput
            value={placeholder}
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
      </div>
    )
  },
  QuestionCard,
  Response: ({ question, order, showNumber = true, value, onChange }) => {
    const { placeholder = "请输入邮箱地址" } = question.config

    return (
      <div className="relative px-3 py-3">
        <QuestionTitleReadonly
          order={order}
          showNumber={showNumber}
          title={question.title}
          description={question.description}
          required={question.required}
        />
        <Input
          type="email"
          value={(value as string) || ""}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          className="mt-3"
        />
      </div>
    )
  },
}
