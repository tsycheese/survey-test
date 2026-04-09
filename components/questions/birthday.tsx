import { Calendar } from "lucide-react"
import { nanoid } from "nanoid"
import { useState } from "react"
import type { QuestionDef, BirthdayQuestion } from "@/lib/questions/types"
import { Label } from "@/components/ui/label"
import { QuestionTitle } from "@/components/questions/question-title"
import { QuestionTitleReadonly } from "@/components/questions/question-title-readonly"
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
  onDescriptionChange,
  onDescriptionBlur,
}: {
  question: BirthdayQuestion
  order: number
  showNumber?: boolean
  onTitleChange?: (title: string) => void
  onTitleBlur?: (title: string) => void
  onDescriptionChange?: (description: string) => void
  onDescriptionBlur?: (description: string) => void
}) {
  const { format = "YYYY-MM-DD" } = question.config
  const currentYear = new Date().getFullYear()

  const years = Array.from({ length: 100 }, (_, i) => currentYear - i)
  const months = Array.from({ length: 12 }, (_, i) => i + 1)
  const days = Array.from({ length: 31 }, (_, i) => i + 1)

  if (format === "YYYY") {
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
        <div className="mt-3">
          <Select>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="请选择年份" />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}年
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    )
  }

  if (format === "MM-DD") {
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
        <div className="mt-3 flex gap-2">
          <Select>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="月" />
            </SelectTrigger>
            <SelectContent>
              {months.map((month) => (
                <SelectItem key={month} value={month.toString()}>
                  {month}月
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="日" />
            </SelectTrigger>
            <SelectContent>
              {days.map((day) => (
                <SelectItem key={day} value={day.toString()}>
                  {day}日
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    )
  }

  // YYYY-MM-DD
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
      <div className="mt-3 flex gap-2">
        <Select>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="年" />
          </SelectTrigger>
          <SelectContent>
            {years.map((year) => (
              <SelectItem key={year} value={year.toString()}>
                {year}年
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select>
          <SelectTrigger className="w-[100px]">
            <SelectValue placeholder="月" />
          </SelectTrigger>
          <SelectContent>
            {months.map((month) => (
              <SelectItem key={month} value={month.toString()}>
                {month}月
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select>
          <SelectTrigger className="w-[100px]">
            <SelectValue placeholder="日" />
          </SelectTrigger>
          <SelectContent>
            {days.map((day) => (
              <SelectItem key={day} value={day.toString()}>
                {day}日
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

export const birthdayDef: QuestionDef<BirthdayQuestion> = {
  type: "BIRTHDAY",
  category: "info",
  label: "生日日期",
  icon: Calendar,
  defaultQuestion: (order) => ({
    id: nanoid(),
    type: "BIRTHDAY",
    title: "新问题",
    required: false,
    order,
    config: {
      format: "YYYY-MM-DD",
    },
  }),
  Canvas: ({ question }) => {
    const { format = "YYYY-MM-DD" } = question.config
    const currentYear = new Date().getFullYear()
    const years = Array.from({ length: 100 }, (_, i) => currentYear - i)
    const months = Array.from({ length: 12 }, (_, i) => i + 1)
    const days = Array.from({ length: 31 }, (_, i) => i + 1)

    if (format === "YYYY") {
      return (
        <div className="mt-3">
          <Select>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="请选择年份" />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}年
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )
    }

    if (format === "MM-DD") {
      return (
        <div className="mt-3 flex gap-2">
          <Select>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="月" />
            </SelectTrigger>
            <SelectContent>
              {months.map((month) => (
                <SelectItem key={month} value={month.toString()}>
                  {month}月
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="日" />
            </SelectTrigger>
            <SelectContent>
              {days.map((day) => (
                <SelectItem key={day} value={day.toString()}>
                  {day}日
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )
    }

    return (
      <div className="mt-3 flex gap-2">
        <Select>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="年" />
          </SelectTrigger>
          <SelectContent>
            {years.map((year) => (
              <SelectItem key={year} value={year.toString()}>
                {year}年
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select>
          <SelectTrigger className="w-[100px]">
            <SelectValue placeholder="月" />
          </SelectTrigger>
          <SelectContent>
            {months.map((month) => (
              <SelectItem key={month} value={month.toString()}>
                {month}月
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select>
          <SelectTrigger className="w-[100px]">
            <SelectValue placeholder="日" />
          </SelectTrigger>
          <SelectContent>
            {days.map((day) => (
              <SelectItem key={day} value={day.toString()}>
                {day}日
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    )
  },
  Editor: ({ question, onSave }) => {
    const { format = "YYYY-MM-DD" } = question.config

    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">日期格式</Label>
          <Select
            value={format}
            onValueChange={(value: "YYYY-MM-DD" | "MM-DD" | "YYYY") =>
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
              <SelectItem value="YYYY-MM-DD">年 - 月-日 (完整日期)</SelectItem>
              <SelectItem value="MM-DD">月 - 日 (不含年份)</SelectItem>
              <SelectItem value="YYYY">年 (仅年份)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="rounded-md border bg-muted p-3 text-xs text-muted-foreground">
          <p>根据选择的格式，用户可以选择：</p>
          <ul className="mt-1 list-inside list-disc space-y-0.5">
            <li>完整日期：1990 年 1 月 1 日</li>
            <li>不含年份：1 月 1 日</li>
            <li>仅年份：1990 年</li>
          </ul>
        </div>
      </div>
    )
  },
  QuestionCard,
  Response: ({ question, order, showNumber = true, value, onChange }) => {
    const { format = "YYYY-MM-DD" } = question.config
    const currentYear = new Date().getFullYear()
    const years = Array.from({ length: 100 }, (_, i) => currentYear - i)
    const months = Array.from({ length: 12 }, (_, i) => i + 1)
    const days = Array.from({ length: 31 }, (_, i) => i + 1)

    const handleChange = (field: string, fieldValue: string) => {
      const currentValue =
        (value as { year?: string; month?: string; day?: string }) || {}
      onChange?.({ ...currentValue, [field]: fieldValue })
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
        {format === "YYYY" && (
          <div className="mt-3">
            <Select
              value={(value as { year?: string })?.year || ""}
              onValueChange={(v) => handleChange("year", v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="请选择年份" />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}年
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {format === "MM-DD" && (
          <div className="mt-3 flex gap-2">
            <Select
              value={(value as { month?: string })?.month || ""}
              onValueChange={(v) => handleChange("month", v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="月" />
              </SelectTrigger>
              <SelectContent>
                {months.map((month) => (
                  <SelectItem key={month} value={month.toString()}>
                    {month}月
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={(value as { day?: string })?.day || ""}
              onValueChange={(v) => handleChange("day", v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="日" />
              </SelectTrigger>
              <SelectContent>
                {days.map((day) => (
                  <SelectItem key={day} value={day.toString()}>
                    {day}日
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {format === "YYYY-MM-DD" && (
          <div className="mt-3 flex gap-2">
            <Select
              value={(value as { year?: string })?.year || ""}
              onValueChange={(v) => handleChange("year", v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="年" />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}年
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={(value as { month?: string })?.month || ""}
              onValueChange={(v) => handleChange("month", v)}
            >
              <SelectTrigger className="w-[100px]">
                <SelectValue placeholder="月" />
              </SelectTrigger>
              <SelectContent>
                {months.map((month) => (
                  <SelectItem key={month} value={month.toString()}>
                    {month}月
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={(value as { day?: string })?.day || ""}
              onValueChange={(v) => handleChange("day", v)}
            >
              <SelectTrigger className="w-[100px]">
                <SelectValue placeholder="日" />
              </SelectTrigger>
              <SelectContent>
                {days.map((day) => (
                  <SelectItem key={day} value={day.toString()}>
                    {day}日
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    )
  },
}
