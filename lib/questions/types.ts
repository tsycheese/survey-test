import type React from "react"

export type BaseQuestion = {
  id: string
  type: string
  title: string
  required: boolean
  order: number
}

export type SingleChoiceConfig = {
  options: { id: string; label: string }[]
  columns?: number
}

export type MultipleChoiceConfig = {
  options: { id: string; label: string }[]
  maxSelect?: number
  minSelect?: number
  columns?: number
}

export type TextConfig = {
  placeholder?: string
  multiline?: boolean
}

export type RatingConfig = {
  min: number
  max: number
  minLabel?: string
  maxLabel?: string
}

export type SingleChoiceQuestion = BaseQuestion & {
  type: "SINGLE_CHOICE"
  config: SingleChoiceConfig
}

export type MultipleChoiceQuestion = BaseQuestion & {
  type: "MULTIPLE_CHOICE"
  config: MultipleChoiceConfig
}

export type TextQuestion = BaseQuestion & {
  type: "TEXT"
  config: TextConfig
}

export type RatingQuestion = BaseQuestion & {
  type: "RATING"
  config: RatingConfig
}

export type Question =
  | SingleChoiceQuestion
  | MultipleChoiceQuestion
  | TextQuestion
  | RatingQuestion

export type QuestionType = Question["type"]

export type QuestionDef<Q extends Question = Question> = {
  type: Q["type"]
  label: string
  icon: React.ElementType
  defaultQuestion: (order: number) => Q
  Canvas: React.FC<{
    question: Q
    selected: boolean
    onUpdate?: (question: Q) => void
  }>
  Editor: React.FC<{
    question: Q
    onChange: (question: Q) => void
  }>
  QuestionCard: React.FC<{
    question: Q
    selected: boolean
    order: number
    onUpdate?: (question: Q) => void
    onTitleClick?: () => void
    onTitleChange?: (title: string) => void
  }>
}

export type Survey = {
  id: string
  title: string
  description: string | null
  published: boolean
  questions: Question[]
}
