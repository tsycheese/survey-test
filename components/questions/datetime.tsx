import { CalendarClock } from "lucide-react"
import { nanoid } from "nanoid"
import { useState } from "react"
import type { QuestionDef, DateTimeQuestion } from "@/lib/questions/types"
import { QuestionTitle } from "@/components/questions/question-title"
import { QuestionTitleReadonly } from "@/components/questions/question-title-readonly"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { DatePicker } from "@/components/ui/date-picker"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// 日期时间格式选项
const FORMAT_OPTIONS = [
  { value: "YYYY-MM-DD HH:mm", label: "年月日时分" },
  { value: "YYYY-MM-DD", label: "年月日" },
  { value: "YYYY-MM", label: "年月" },
  { value: "YYYY", label: "年" },
  { value: "HH:mm", label: "时分" },
] as const

type FormatValue = (typeof FORMAT_OPTIONS)[number]["value"]

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
  question: DateTimeQuestion
  order: number
  showNumber?: boolean
  onTitleChange?: (title: string) => void
  onTitleBlur?: (title: string) => void
  onDescriptionChange?: (description: string) => void
  onDescriptionBlur?: (description: string) => void
  onFocusQuestion?: () => void
}) {
  const { format = "YYYY-MM-DD HH:mm" } = question.config

  const showDate = format.includes("YYYY")
  const showTime = format.includes("HH")
  const showMonth = format.includes("MM")
  const showDay = format.includes("DD")
  // 只有年月日或年月日时分格式使用 DatePicker
  const useDatePicker = showDate && showDay

  // 生成选项列表
  const hours = Array.from({ length: 24 }, (_, i) => i)
  const minutes = Array.from({ length: 60 }, (_, i) => i)

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

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {useDatePicker ? (
          // 年月日或年月日时分格式使用 DatePicker
          <>
            <DatePicker placeholder="选择日期" className="w-[200px]" />
            {showTime && (
              <>
                <Select>
                  <SelectTrigger className="w-[80px]">
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
                  <SelectTrigger className="w-[80px]">
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
              </>
            )}
          </>
        ) : (
          <>
            {showDate && (
              <>
                <Select>
                  <SelectTrigger className="w-[100px]">
                    <SelectValue placeholder="年" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from(
                      { length: 100 },
                      (_, i) => new Date().getFullYear() - 50 + i
                    ).map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}年
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {showMonth && (
                  <>
                    <Select>
                      <SelectTrigger className="w-[80px]">
                        <SelectValue placeholder="月" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(
                          (month) => (
                            <SelectItem key={month} value={month.toString()}>
                              {month.toString().padStart(2, "0")}月
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                    {showDay && (
                      <Select>
                        <SelectTrigger className="w-[80px]">
                          <SelectValue placeholder="日" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 31 }, (_, i) => i + 1).map(
                            (day) => (
                              <SelectItem key={day} value={day.toString()}>
                                {day.toString().padStart(2, "0")}日
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>
                    )}
                  </>
                )}
              </>
            )}
            {showTime && (
              <>
                {showDate && <span className="text-muted-foreground"> </span>}
                <Select>
                  <SelectTrigger className="w-[80px]">
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
                  <SelectTrigger className="w-[80px]">
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
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export const dateTimeDef: QuestionDef<DateTimeQuestion> = {
  type: "DATETIME",
  category: "advanced",
  label: "日期时间",
  icon: CalendarClock,
  defaultQuestion: (order) => ({
    id: nanoid(),
    type: "DATETIME",
    title: "请选择日期时间",
    required: false,
    order,
    config: {
      format: "YYYY-MM-DD HH:mm",
      minDate: "",
      maxDate: "",
    },
  }),
  Canvas: ({ question }) => {
    const { format = "YYYY-MM-DD HH:mm", minDate, maxDate } = question.config

    const showDate = format.includes("YYYY")
    const showTime = format.includes("HH")
    const showMonth = format.includes("MM")
    const showDay = format.includes("DD")
    // 只有年月日或年月日时分格式使用 DatePicker
    const useDatePicker = showDate && showDay

    // 计算日期范围
    const minYear = minDate ? new Date(minDate).getFullYear() : 1900
    const maxYear = maxDate ? new Date(maxDate).getFullYear() : 2100

    // 生成选项列表
    const hours = Array.from({ length: 24 }, (_, i) => i)
    const minutes = Array.from({ length: 60 }, (_, i) => i)

    return (
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {useDatePicker ? (
          // 年月日或年月日时分格式使用 DatePicker
          <>
            <DatePicker
              placeholder="选择日期"
              className="w-[200px]"
              minDate={minDate ? new Date(minDate) : undefined}
              maxDate={maxDate ? new Date(maxDate) : undefined}
            />
            {showTime && (
              <>
                <Select>
                  <SelectTrigger className="w-[80px]">
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
                  <SelectTrigger className="w-[80px]">
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
              </>
            )}
          </>
        ) : (
          <>
            {showDate && (
              <>
                <Select>
                  <SelectTrigger className="w-[100px]">
                    <SelectValue placeholder="年" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from(
                      { length: maxYear - minYear + 1 },
                      (_, i) => minYear + i
                    ).map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}年
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {showMonth && (
                  <>
                    <Select>
                      <SelectTrigger className="w-[80px]">
                        <SelectValue placeholder="月" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(
                          (month) => (
                            <SelectItem key={month} value={month.toString()}>
                              {month.toString().padStart(2, "0")}月
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                    {showDay && (
                      <Select>
                        <SelectTrigger className="w-[80px]">
                          <SelectValue placeholder="日" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 31 }, (_, i) => i + 1).map(
                            (day) => (
                              <SelectItem key={day} value={day.toString()}>
                                {day.toString().padStart(2, "0")}日
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>
                    )}
                  </>
                )}
              </>
            )}
            {showTime && (
              <>
                {showDate && <span className="text-muted-foreground"> </span>}
                <Select>
                  <SelectTrigger className="w-[80px]">
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
                  <SelectTrigger className="w-[80px]">
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
              </>
            )}
          </>
        )}
      </div>
    )
  },
  Editor: ({ question, onChange, onSave }) => {
    const { format = "YYYY-MM-DD HH:mm", minDate, maxDate } = question.config

    const showDate = format.includes("YYYY")
    const showTime = format.includes("HH")

    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">日期时间格式</Label>
          <Select
            value={format}
            onValueChange={(value: FormatValue) =>
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
              {FORMAT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {showDate && (
          <>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">最小日期</Label>
              <Input
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
              <Input
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
          </>
        )}

        <div className="rounded-md border bg-muted p-3 text-xs text-muted-foreground">
          <p>
            用户可以选择
            {FORMAT_OPTIONS.find((o) => o.value === format)?.label ||
              "日期时间"}
            。
          </p>
        </div>
      </div>
    )
  },
  QuestionCard,
  Response: ({ question, order, showNumber = true, value, onChange }) => {
    const { format = "YYYY-MM-DD HH:mm", minDate, maxDate } = question.config

    const showDate = format.includes("YYYY")
    const showTime = format.includes("HH")
    const showMonth = format.includes("MM")
    const showDay = format.includes("DD")
    const useDatePicker = showDate && showDay

    const minYear = minDate ? new Date(minDate).getFullYear() : 1900
    const maxYear = maxDate ? new Date(maxDate).getFullYear() : 2100

    const hours = Array.from({ length: 24 }, (_, i) => i)
    const minutes = Array.from({ length: 60 }, (_, i) => i)

    // 解析当前值
    const currentValue = value as
      | {
          date?: Date
          year?: string
          month?: string
          day?: string
          hour?: string
          minute?: string
        }
      | undefined

    const handleDateChange = (date: Date | undefined) => {
      onChange?.({ ...currentValue, date })
    }

    const handleYearChange = (year: string) => {
      onChange?.({ ...currentValue, year })
    }

    const handleMonthChange = (month: string) => {
      onChange?.({ ...currentValue, month })
    }

    const handleDayChange = (day: string) => {
      onChange?.({ ...currentValue, day })
    }

    const handleHourChange = (hour: string) => {
      onChange?.({ ...currentValue, hour })
    }

    const handleMinuteChange = (minute: string) => {
      onChange?.({ ...currentValue, minute })
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
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {useDatePicker ? (
            <>
              <DatePicker
                placeholder="选择日期"
                className="w-[200px]"
                value={currentValue?.date}
                onChange={handleDateChange}
                minDate={minDate ? new Date(minDate) : undefined}
                maxDate={maxDate ? new Date(maxDate) : undefined}
              />
              {showTime && (
                <>
                  <Select
                    value={currentValue?.hour || ""}
                    onValueChange={handleHourChange}
                  >
                    <SelectTrigger className="w-[80px]">
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
                  <Select
                    value={currentValue?.minute || ""}
                    onValueChange={handleMinuteChange}
                  >
                    <SelectTrigger className="w-[80px]">
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
                </>
              )}
            </>
          ) : (
            <>
              {showDate && (
                <>
                  <Select
                    value={currentValue?.year || ""}
                    onValueChange={handleYearChange}
                  >
                    <SelectTrigger className="w-[100px]">
                      <SelectValue placeholder="年" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from(
                        { length: maxYear - minYear + 1 },
                        (_, i) => minYear + i
                      ).map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}年
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {showMonth && (
                    <>
                      <Select
                        value={currentValue?.month || ""}
                        onValueChange={handleMonthChange}
                      >
                        <SelectTrigger className="w-[80px]">
                          <SelectValue placeholder="月" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 12 }, (_, i) => i + 1).map(
                            (month) => (
                              <SelectItem key={month} value={month.toString()}>
                                {month.toString().padStart(2, "0")}月
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>
                      {showDay && (
                        <Select
                          value={currentValue?.day || ""}
                          onValueChange={handleDayChange}
                        >
                          <SelectTrigger className="w-[80px]">
                            <SelectValue placeholder="日" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 31 }, (_, i) => i + 1).map(
                              (day) => (
                                <SelectItem key={day} value={day.toString()}>
                                  {day.toString().padStart(2, "0")}日
                                </SelectItem>
                              )
                            )}
                          </SelectContent>
                        </Select>
                      )}
                    </>
                  )}
                </>
              )}
              {showTime && (
                <>
                  {showDate && <span className="text-muted-foreground"> </span>}
                  <Select
                    value={currentValue?.hour || ""}
                    onValueChange={handleHourChange}
                  >
                    <SelectTrigger className="w-[80px]">
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
                  <Select
                    value={currentValue?.minute || ""}
                    onValueChange={handleMinuteChange}
                  >
                    <SelectTrigger className="w-[80px]">
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
                </>
              )}
            </>
          )}
        </div>
      </div>
    )
  },
}
