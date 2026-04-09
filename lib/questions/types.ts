import type React from "react"

export type BaseQuestion = {
  id: string
  type: string
  title: string
  required: boolean
  order: number
}

// ============ 选择类 ============
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

export type DropdownConfig = {
  options: { id: string; label: string }[]
  placeholder?: string
}

export type RankingConfig = {
  options: { id: string; label: string }[]
}

export type MatrixSingleConfig = {
  rows: { id: string; label: string }[]
  columns: { id: string; label: string }[]
}

// ============ 文本输入类 ============
export type TextFormat = "any" | "number" | "date" | "email" | "phone"

export type TextConfig = {
  placeholder?: string
  format?: TextFormat
}

export type TextareaConfig = {
  placeholder?: string
  maxLength?: number
  rows?: number
}

export type NumberConfig = {
  placeholder?: string
  min?: number
  max?: number
  step?: number
  prefix?: string
  suffix?: string
}

// ============ 量表评分类 ============
export type RatingConfig = {
  min: number
  max: number
  minLabel?: string
  maxLabel?: string
}

export type NPSConfig = {
  min?: number
  max?: number
  lowLabel?: string
  highLabel?: string
}

export type CESConfig = {
  min?: number
  max?: number
  lowLabel?: string
  highLabel?: string
}

export type MatrixScaleConfig = {
  rows: { id: string; label: string }[]
  scale: { id: string; label: string }[]
}

// ============ 个人信息类 ============
export type NameConfig = {
  placeholder?: string
  firstName?: boolean
  lastName?: boolean
}

export type GenderConfig = {
  options?: { id: string; label: string }[]
}

export type BirthdayConfig = {
  format?: "YYYY-MM-DD" | "MM-DD" | "YYYY"
  minDate?: string
  maxDate?: string
}

// ============ 联系方式类 ============
export type PhoneConfig = {
  placeholder?: string
  countryCode?: boolean
}

export type EmailConfig = {
  placeholder?: string
}

export type DateTimeConfig = {
  format?: "YYYY-MM-DD HH:mm" | "YYYY-MM-DD" | "YYYY-MM" | "YYYY" | "HH:mm"
  minDate?: string
  maxDate?: string
}

// ============ 图片选择类 ============
export type ImageOption = {
  id: string
  imageUrl: string
  publicId?: string // Cloudinary public_id，用于删除
  title?: string
  label?: string
  width?: number
  height?: number
}

export type ImageSingleChoiceConfig = {
  options: ImageOption[]
  columns?: number
  showLabels?: boolean
  showTitles?: boolean
  aspectRatio?: string
}

export type ImageMultipleChoiceConfig = {
  options: ImageOption[]
  columns?: number
  showLabels?: boolean
  showTitles?: boolean
  aspectRatio?: string
  maxSelect?: number
  minSelect?: number
}

// ============ 题目类型联合 ============
export type SingleChoiceQuestion = BaseQuestion & {
  type: "SINGLE_CHOICE"
  config: SingleChoiceConfig
}

export type MultipleChoiceQuestion = BaseQuestion & {
  type: "MULTIPLE_CHOICE"
  config: MultipleChoiceConfig
}

export type DropdownQuestion = BaseQuestion & {
  type: "DROPDOWN"
  config: DropdownConfig
}

export type RankingQuestion = BaseQuestion & {
  type: "RANKING"
  config: RankingConfig
}

export type MatrixSingleQuestion = BaseQuestion & {
  type: "MATRIX_SINGLE"
  config: MatrixSingleConfig
}

export type TextQuestion = BaseQuestion & {
  type: "TEXT"
  config: TextConfig
}

export type TextareaQuestion = BaseQuestion & {
  type: "TEXTAREA"
  config: TextareaConfig
}

export type NumberQuestion = BaseQuestion & {
  type: "NUMBER"
  config: NumberConfig
}

export type RatingQuestion = BaseQuestion & {
  type: "RATING"
  config: RatingConfig
}

export type NPSQuestion = BaseQuestion & {
  type: "NPS"
  config: NPSConfig
}

export type CESQuestion = BaseQuestion & {
  type: "CES"
  config: CESConfig
}

export type MatrixScaleQuestion = BaseQuestion & {
  type: "MATRIX_SCALE"
  config: MatrixScaleConfig
}

export type NameQuestion = BaseQuestion & {
  type: "NAME"
  config: NameConfig
}

export type GenderQuestion = BaseQuestion & {
  type: "GENDER"
  config: GenderConfig
}

export type BirthdayQuestion = BaseQuestion & {
  type: "BIRTHDAY"
  config: BirthdayConfig
}

export type PhoneQuestion = BaseQuestion & {
  type: "PHONE"
  config: PhoneConfig
}

export type EmailQuestion = BaseQuestion & {
  type: "EMAIL"
  config: EmailConfig
}

export type DateTimeQuestion = BaseQuestion & {
  type: "DATETIME"
  config: DateTimeConfig
}

export type ImageSingleChoiceQuestion = BaseQuestion & {
  type: "IMAGE_SINGLE_CHOICE"
  config: ImageSingleChoiceConfig
}

export type ImageMultipleChoiceQuestion = BaseQuestion & {
  type: "IMAGE_MULTIPLE_CHOICE"
  config: ImageMultipleChoiceConfig
}

// ============ 所有题目类型联合 ============
export type Question =
  | SingleChoiceQuestion
  | MultipleChoiceQuestion
  | DropdownQuestion
  | RankingQuestion
  | MatrixSingleQuestion
  | TextQuestion
  | TextareaQuestion
  | NumberQuestion
  | RatingQuestion
  | NPSQuestion
  | CESQuestion
  | MatrixScaleQuestion
  | NameQuestion
  | GenderQuestion
  | BirthdayQuestion
  | PhoneQuestion
  | EmailQuestion
  | DateTimeQuestion
  | ImageSingleChoiceQuestion
  | ImageMultipleChoiceQuestion

export type QuestionType = Question["type"]

// ============ 题型分类 ============
export type QuestionCategory =
  | "choice"
  | "text"
  | "advanced"
  | "matrix"
  | "info"
  | "contact"

export const QUESTION_CATEGORIES: Record<
  QuestionCategory,
  { label: string; icon: string }
> = {
  choice: { label: "选择类", icon: "☑️" },
  text: { label: "文本输入", icon: "✍️" },
  advanced: { label: "高级题型", icon: "🚀" },
  matrix: { label: "矩阵题型", icon: "📐" },
  info: { label: "个人信息", icon: "👤" },
  contact: { label: "联系方式", icon: "📞" },
}

export type QuestionDef<Q extends Question = Question> = {
  type: Q["type"]
  category: QuestionCategory
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
    onSave?: (question: Q) => void
  }>
  QuestionCard: React.FC<{
    question: Q
    selected: boolean
    order: number
    showNumber?: boolean
    onUpdate?: (question: Q) => void
    onTitleClick?: () => void
    onTitleChange?: (title: string) => void
    onTitleBlur?: (title: string) => void
    onOptionChange?: (question: Q) => void
  }>
}

export type SurveySettings = {
  showQuestionNumber?: boolean
}

export type Survey = {
  id: string
  title: string
  description: string | null
  published: boolean
  questions: Question[]
  settings?: SurveySettings
}
