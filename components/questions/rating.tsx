import { Star } from "lucide-react"
import { nanoid } from "nanoid"
import type { QuestionDef, RatingQuestion } from "@/lib/questions/types"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

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
        <span className="ml-2 text-xs text-muted-foreground">{question.config.minLabel}</span>
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
                onClick={() => onChange({ ...question, config: { ...config, max: n } })}
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
              onChange({ ...question, config: { ...config, minLabel: e.target.value } })
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
              onChange({ ...question, config: { ...config, maxLabel: e.target.value } })
            }
            placeholder="如：非常满意"
            className="h-8 text-sm"
          />
        </div>
      </div>
    )
  },
}
