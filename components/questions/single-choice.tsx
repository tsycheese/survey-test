import { CircleDot } from "lucide-react"
import { nanoid } from "nanoid"
import type { QuestionDef, SingleChoiceQuestion } from "@/lib/questions/types"
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

export const singleChoiceDef: QuestionDef<SingleChoiceQuestion> = {
  type: "SINGLE_CHOICE",
  label: "单选题",
  icon: CircleDot,
  defaultQuestion: (order) => ({
    id: nanoid(),
    type: "SINGLE_CHOICE",
    title: "新问题",
    required: false,
    order,
    config: {
      options: [
        { id: nanoid(), label: "选项1" },
        { id: nanoid(), label: "选项2" },
      ],
      columns: 1,
    },
  }),
  Canvas: ({ question }) => {
    const { options, columns = 1 } = question.config

    return (
      <div
        className="grid gap-2"
        style={{
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        }}
      >
        {options.map((opt) => (
          <div
            key={opt.id}
            className="flex items-center gap-3 rounded-lg border bg-card p-3 text-sm transition-shadow hover:shadow-sm"
          >
            <div className="h-4 w-4 shrink-0 rounded-full border border-primary/50" />
            <span className="truncate font-medium">{opt.label}</span>
          </div>
        ))}
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
                <div className="h-3.5 w-3.5 shrink-0 rounded-full border border-border" />
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
}
