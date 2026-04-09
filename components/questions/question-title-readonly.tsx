"use client"

interface QuestionTitleReadonlyProps {
  order?: number
  showNumber?: boolean
  title: string
  description?: string
  required?: boolean
}

export function QuestionTitleReadonly({
  order,
  showNumber = true,
  title,
  description,
  required,
}: QuestionTitleReadonlyProps) {
  return (
    <div className="relative flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-2">
        <div className="flex flex-1 items-baseline">
          {showNumber && order && (
            <span className="mr-2 text-base font-medium text-muted-foreground">
              {order}.
            </span>
          )}
          <div className="flex-1 overflow-hidden">
            <div
              className="block w-full px-2 py-1 text-base leading-6 font-medium break-all"
              style={{ minHeight: "36px" }}
            >
              {title || "请输入题目标题"}
              {required && <span className="ml-1 text-red-500">*</span>}
            </div>
          </div>
        </div>
      </div>

      {/* 题目描述 */}
      {description && (
        <div className="px-2 py-1 text-sm leading-5 break-all text-muted-foreground">
          {description}
        </div>
      )}
    </div>
  )
}
