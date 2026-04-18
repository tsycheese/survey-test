"use client"

import React, { useState, useRef } from "react"

interface QuestionTitleProps {
  order?: number
  showNumber?: boolean
  title: string
  description?: string
  required?: boolean
  onChange?: (title: string) => void
  onBlur?: (title: string) => void
  onDescriptionChange?: (description: string) => void
  onDescriptionBlur?: (description: string) => void
  onFocusQuestion?: () => void
}

export function QuestionTitle({
  order,
  showNumber = true,
  title,
  description,
  required,
  onChange,
  onBlur,
  onDescriptionChange,
  onDescriptionBlur,
  onFocusQuestion,
}: QuestionTitleProps) {
  const [editingTitle, setEditingTitle] = useState(false)
  const [editingDesc, setEditingDesc] = useState(false)
  const [descValue, setDescValue] = useState(description || "")
  const titleRef = useRef<HTMLTextAreaElement>(null)
  const descRef = useRef<HTMLTextAreaElement>(null)
  const originalTitleRef = useRef(title)
  const originalDescRef = useRef(description || "")

  // 当外部 description 变化时，同步更新内部状态
  React.useEffect(() => {
    if (!editingDesc) {
      setDescValue(description || "")
    }
  }, [description, editingDesc])

  const handleChange = (value: string) => {
    onChange?.(value)
  }

  const handleTitleBlur = (value: string) => {
    setEditingTitle(false)
    if (value !== originalTitleRef.current) {
      onBlur?.(value)
    }
  }

  // 将光标移动到文本末尾
  const moveCursorToEnd = (element: HTMLTextAreaElement) => {
    const length = element.value.length
    element.setSelectionRange(length, length)
  }

  const handleDescChange = (value: string) => {
    setDescValue(value)
    onDescriptionChange?.(value)
  }

  const handleDescBlur = (value: string) => {
    setEditingDesc(false)
    if (value !== originalDescRef.current) {
      onDescriptionBlur?.(value)
    }
  }

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
            {editingTitle ? (
              <textarea
                ref={titleRef}
                autoFocus
                rows={1}
                className="block w-full resize-none overflow-hidden rounded-sm border-2 border-primary bg-transparent px-2 py-1 text-base leading-6 font-medium shadow-none ring-0 outline-none focus-visible:ring-0"
                style={{ minHeight: "36px" }}
                value={title}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    setEditingTitle(false)
                  }
                }}
                onChange={(e) => {
                  const target = e.target as HTMLTextAreaElement
                  handleChange(target.value)
                }}
                onBlur={(e) => handleTitleBlur(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                onFocus={(e) => {
                  originalTitleRef.current = title
                  // 延迟执行，确保在 autoFocus 之后
                  setTimeout(() => moveCursorToEnd(e.target), 0)
                }}
              />
            ) : (
              <div
                onClick={(e) => {
                  e.stopPropagation()
                  onFocusQuestion?.()
                  setEditingTitle(true)
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

      {/* 题目描述 */}
      <div className="">
        {editingDesc ? (
          <textarea
            autoFocus
            rows={1}
            className="block w-full resize-none overflow-hidden rounded-sm border-2 border-primary bg-transparent px-0 py-1 text-sm leading-5 text-muted-foreground shadow-none ring-0 outline-none focus-visible:ring-0"
            style={{ minHeight: "28px" }}
            value={descValue}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                setEditingDesc(false)
              }
            }}
            onChange={(e) => {
              const target = e.target as HTMLTextAreaElement
              handleDescChange(target.value)
            }}
            onBlur={(e) => handleDescBlur(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onFocus={(e) => {
              originalDescRef.current = description || ""
              // 延迟执行，确保在 autoFocus 之后
              setTimeout(() => moveCursorToEnd(e.target), 0)
            }}
            placeholder="添加题目描述（可选）"
          />
        ) : (
          <div
            onClick={(e) => {
              e.stopPropagation()
              onFocusQuestion?.()
              setEditingDesc(true)
            }}
            className="group/desc relative block w-full cursor-text rounded-sm border-2 border-transparent px-0 py-1 text-sm leading-5 break-all text-muted-foreground hover:border-dashed hover:border-border"
            style={{ minHeight: "28px" }}
          >
            {descValue || "添加题目描述（可选）"}
          </div>
        )}
      </div>
    </div>
  )
}
