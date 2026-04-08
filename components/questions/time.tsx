import { Clock } from "lucide-react"
import { nanoid } from "nanoid"
import type { QuestionDef, TimeQuestion } from "@/lib/questions/types"
import { Label } from "@/components/ui/label"
import { QuestionTitle } from "@/components/questions/question-title"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

function QuestionCard({
  question,
  order,
  showNumber = true,
  onTitleChange,
  onTitleBlur,
}: {
  question: TimeQuestion
  order: number
  showNumber?: boolean
  onTitleChange?: (title: string) => void
  onTitleBlur?: (title: string) => void
}) {
  const { format = "HH:mm" } = question.config

  const hours = Array.from({ length: 24 }, (_, i) => i)
  const minutes = Array.from({ length: 60 }, (_, i) => i)
  const seconds = Array.from({ length: 60 }, (_, i) => i)

  const showSeconds = format === "HH:mm:ss"

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

      <div className="mt-3 flex items-center gap-2">
        <Select>
          <SelectTrigger className="w-[100px]">
            <SelectValue placeholder="时" />
          </SelectTrigger>
          <SelectContent>
            {hours.map((hour) => (
              <SelectItem key={hour} value={hour.toString()}>
                {hour.toString().padStart(2, "0")}时
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-muted-foreground">:</span>
        <Select>
          <SelectTrigger className="w-[100px]">
            <SelectValue placeholder="分" />
          </SelectTrigger>
          <SelectContent>
            {minutes.map((minute) => (
              <SelectItem key={minute} value={minute.toString()}>
                {minute.toString().padStart(2, "0")}分
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {showSeconds && (
          <>
            <span className="text-muted-foreground">:</span>
            <Select>
              <SelectTrigger className="w-[100px]">
                <SelectValue placeholder="秒" />
              </SelectTrigger>
              <SelectContent>
                {seconds.map((second) => (
                  <SelectItem key={second} value={second.toString()}>
                    {second.toString().padStart(2, "0")}秒
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        )}
      </div>
    </div>
  )
}

export const timeDef: QuestionDef<TimeQuestion> = {
  type: "TIME",
  category: "datetime",
  label: "时间选择",
  icon: Clock,
  defaultQuestion: (order) => ({
    id: nanoid(),
    type: "TIME",
    title: "新问题",
    required: false,
    order,
    config: {
      format: "HH:mm",
    },
  }),
  Canvas: ({ question }) => {
    const { format = "HH:mm" } = question.config
    const hours = Array.from({ length: 24 }, (_, i) => i)
    const minutes = Array.from({ length: 60 }, (_, i) => i)
    const seconds = Array.from({ length: 60 }, (_, i) => i)
    const showSeconds = format === "HH:mm:ss"

    return (
      <div className="mt-3 flex items-center gap-2">
        <Select>
          <SelectTrigger className="w-[100px]">
            <SelectValue placeholder="时" />
          </SelectTrigger>
          <SelectContent>
            {hours.map((hour) => (
              <SelectItem key={hour} value={hour.toString()}>
                {hour.toString().padStart(2, "0")}时
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-muted-foreground">:</span>
        <Select>
          <SelectTrigger className="w-[100px]">
            <SelectValue placeholder="分" />
          </SelectTrigger>
          <SelectContent>
            {minutes.map((minute) => (
              <SelectItem key={minute} value={minute.toString()}>
                {minute.toString().padStart(2, "0")}分
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {showSeconds && (
          <>
            <span className="text-muted-foreground">:</span>
            <Select>
              <SelectTrigger className="w-[100px]">
                <SelectValue placeholder="秒" />
              </SelectTrigger>
              <SelectContent>
                {seconds.map((second) => (
                  <SelectItem key={second} value={second.toString()}>
                    {second.toString().padStart(2, "0")}秒
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        )}
      </div>
    )
  },
  Editor: ({ question, onSave }) => {
    const { format = "HH:mm" } = question.config

    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">时间格式</Label>
          <Select
            value={format}
            onValueChange={(value: "HH:mm" | "HH:mm:ss") =>
              onSave?.({
                ...question,
                config: { ...question.config, format: value },
              })
            }
          >
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="HH:mm">时：分 (例如 14:30)</SelectItem>
              <SelectItem value="HH:mm:ss">
                时：分：秒 (例如 14:30:45)
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="rounded-md border bg-muted p-3 text-xs text-muted-foreground">
          <p>用户可以选择具体的时间点，支持精确到秒。</p>
        </div>
      </div>
    )
  },
  QuestionCard,
}
