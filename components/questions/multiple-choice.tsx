import { CheckSquare, PlusCircle, Trash2 } from "lucide-react"
import { nanoid } from "nanoid"
import type { QuestionDef, MultipleChoiceQuestion } from "@/lib/questions/types"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

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
        { id: nanoid(), label: "选项1" },
        { id: nanoid(), label: "选项2" },
      ],
    },
  }),
  Canvas: ({ question }) => (
    <div className="space-y-1.5">
      {question.config.options.map((opt) => (
        <div
          key={opt.id}
          className="flex items-center gap-2 text-sm text-muted-foreground"
        >
          <div className="h-3.5 w-3.5 shrink-0 rounded-sm border border-border" />
          {opt.label}
        </div>
      ))}
    </div>
  ),
  Editor: ({ question, onChange }) => {
    const { options } = question.config

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
    )
  },
}
