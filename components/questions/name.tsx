import { User } from "lucide-react"
import { nanoid } from "nanoid"
import type { QuestionDef, NameQuestion } from "@/lib/questions/types"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { QuestionTitle } from "@/components/questions/question-title"
import { Switch } from "@/components/ui/switch"

function QuestionCard({
  question,
  order,
  showNumber = true,
  onTitleChange,
  onTitleBlur,
}: {
  question: NameQuestion
  order: number
  showNumber?: boolean
  onTitleChange?: (title: string) => void
  onTitleBlur?: (title: string) => void
}) {
  const {
    placeholder = "请输入姓名",
    firstName = false,
    lastName = false,
  } = question.config

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

      <div className="mt-3 space-y-3">
        {firstName && (
          <div className="space-y-2">
            <Label className="text-sm">名</Label>
            <Input placeholder={placeholder || "请输入名"} />
          </div>
        )}
        {lastName && (
          <div className="space-y-2">
            <Label className="text-sm">姓</Label>
            <Input placeholder={placeholder || "请输入姓"} />
          </div>
        )}
        {!firstName && !lastName && (
          <div className="space-y-2">
            <Label className="text-sm">姓名</Label>
            <Input placeholder={placeholder || "请输入姓名"} />
          </div>
        )}
      </div>
    </div>
  )
}

export const nameDef: QuestionDef<NameQuestion> = {
  type: "NAME",
  category: "info",
  label: "姓名",
  icon: User,
  defaultQuestion: (order) => ({
    id: nanoid(),
    type: "NAME",
    title: "新问题",
    required: false,
    order,
    config: {
      placeholder: "",
      firstName: false,
      lastName: false,
    },
  }),
  Canvas: ({ question }) => {
    const {
      placeholder = "请输入姓名",
      firstName = false,
      lastName = false,
    } = question.config

    return (
      <div className="mt-3 space-y-3">
        {firstName && (
          <div className="space-y-2">
            <Label className="text-sm">名</Label>
            <Input placeholder={placeholder || "请输入名"} />
          </div>
        )}
        {lastName && (
          <div className="space-y-2">
            <Label className="text-sm">姓</Label>
            <Input placeholder={placeholder || "请输入姓"} />
          </div>
        )}
        {!firstName && !lastName && (
          <div className="space-y-2">
            <Label className="text-sm">姓名</Label>
            <Input placeholder={placeholder || "请输入姓名"} />
          </div>
        )}
      </div>
    )
  },
  Editor: ({ question, onChange, onSave }) => {
    const {
      placeholder = "",
      firstName = false,
      lastName = false,
    } = question.config

    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">占位提示文字</Label>
          <Input
            value={placeholder}
            onChange={(e) =>
              onChange({
                ...question,
                config: { ...question.config, placeholder: e.target.value },
              })
            }
            onBlur={() =>
              onSave?.({
                ...question,
                config: { ...question.config, placeholder },
              })
            }
            placeholder="请输入..."
            className="h-8 text-sm"
          />
        </div>

        <div className="space-y-3">
          <Label className="text-xs text-muted-foreground">输入模式</Label>
          <div className="flex items-center justify-between">
            <Label className="text-sm">分离姓和名</Label>
            <Switch
              checked={firstName}
              onCheckedChange={(checked) =>
                onSave?.({
                  ...question,
                  config: { ...question.config, firstName: checked },
                })
              }
            />
          </div>
          <p className="text-xs text-muted-foreground">
            开启后将显示&ldquo;姓&rdquo;和&ldquo;名&rdquo;两个输入框
          </p>
        </div>
      </div>
    )
  },
  QuestionCard,
}
