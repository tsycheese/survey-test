import { AlignLeft } from "lucide-react"
import { nanoid } from "nanoid"
import type { QuestionDef, TextQuestion } from "@/lib/questions/types"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { QuestionTitle } from "@/components/questions/question-title"

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
    <div className="mt-3">
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
  QuestionCard: ({
    question,
    order,
    showNumber = true,
    onTitleChange,
    onTitleBlur,
  }) => (
    <div className="relative px-3 py-3">
      <QuestionTitle
        order={order}
        showNumber={showNumber}
        title={question.title}
        required={question.required}
        onChange={onTitleChange}
        onBlur={onTitleBlur}
      />
      <div className="mt-3">
        {question.config.multiline ? (
          <div className="h-16 rounded border border-dashed border-border bg-muted/30" />
        ) : (
          <div className="h-8 rounded border border-dashed border-border bg-muted/30" />
        )}
      </div>
    </div>
  ),
}
