"use client"

import { useState } from "react"

interface QuestionTitleProps {
  order?: number
  showNumber?: boolean
  title: string
  required?: boolean
  onChange?: (title: string) => void
}

export function QuestionTitle({
  order,
  showNumber = true,
  title,
  required,
  onChange,
}: QuestionTitleProps) {
  const [editing, setEditing] = useState(false)

  const handleChange = (value: string) => {
    onChange?.(value)
  }

  return (
    <div className="relative flex items-baseline justify-between gap-2">
      <div className="flex flex-1 items-baseline">
        {showNumber && order && (
          <span className="mr-2 text-base font-medium text-muted-foreground">
            {order}.
          </span>
        )}
        <div className="flex-1 overflow-hidden">
          {editing ? (
            <textarea
              autoFocus
              rows={1}
              className="block w-full resize-none overflow-hidden rounded-sm border-2 border-primary bg-transparent px-2 py-1 text-base leading-6 font-medium shadow-none ring-0 outline-none focus-visible:ring-0"
              style={{ minHeight: "36px" }}
              value={title}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  setEditing(false)
                }
              }}
              onChange={(e) => {
                const target = e.target as HTMLTextAreaElement
                target.style.height = "auto"
                target.style.height = `${Math.max(target.scrollHeight, 36)}px`
                handleChange(target.value)
              }}
              onBlur={() => setEditing(false)}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <div
              onClick={(e) => {
                e.stopPropagation()
                setEditing(true)
              }}
              className="group/title relative block w-full cursor-text rounded-sm border-2 border-transparent px-2 py-1 text-base leading-6 font-medium break-all hover:border-dashed hover:border-border"
              style={{ minHeight: "36px" }}
            >
              {title || "请输入题目标题"}
              {required && <span className="ml-1 text-red-500">*</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
