export type QuestionType =
  | "SINGLE_CHOICE"
  | "MULTIPLE_CHOICE"
  | "TEXT"
  | "TEXTAREA"
  | "RATING"
  | "NPS"
  | "DROPDOWN"
  | "RANKING"
  | "NUMBER"
  | "CES"
  | "PHONE"
  | "EMAIL"
  | "DATETIME"
  | "NAME"
  | "GENDER"
  | "BIRTHDAY"
  | "MATRIX_SINGLE"
  | "IMAGE_SINGLE_CHOICE"
  | "IMAGE_MULTIPLE_CHOICE"

export type QuestionConfig = {
  options?: { id: string; label: string }[]
  rows?: { id: string; label: string }[]
  columns?: { id: string; label: string }[]
  min?: number
  max?: number
  minLabel?: string
  maxLabel?: string
  lowLabel?: string
  highLabel?: string
}

export type QuestionStat = {
  id: string
  title: string
  type: QuestionType
  config: QuestionConfig | null
  answers: { value: unknown }[]
}

export type Version = {
  id: string
  version: number
}

export type ResponseItem = {
  id: string
  createdAt: string
  startedAt: string | null
  completedAt: string | null
  deviceType: string | null
  os: string | null
  browser: string | null
  source: string | null
  referrer: string | null
  ip: string | null
  country: string | null
  province: string | null
  city: string | null
  answers: { questionId: string; value: unknown }[]
}

export type DailyTrend = {
  date: string
  views: number
  responses: number
}

export type NamedCount = {
  name: string
  count: number
}

export type ResultsData = {
  survey: { title: string; description: string | null }
  totalResponses: number
  totalViews: number
  completionRate: number
  avgCompletionTime: number
  deviceStats: NamedCount[]
  osStats: NamedCount[]
  browserStats: NamedCount[]
  sourceStats: NamedCount[]
  locationStats: NamedCount[]
  dailyTrend: DailyTrend[]
  versions: Version[]
  currentVersionId: string | null
  questions: QuestionStat[]
  responses: ResponseItem[]
}

export type ResultsTab = "overview" | "details" | "charts" | "cross"
