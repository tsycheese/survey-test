// 频道名称工具函数（使用 Presence Channel）
export const getSurveyChannel = (surveyId: string) =>
  `presence-survey-${surveyId}`

export const REALTIME_CLIENT_ID_HEADER = "x-realtime-client-id"
export const REALTIME_REQUEST_ID_HEADER = "x-request-id"
export const QUESTION_LOCK_ID_HEADER = "x-question-lock-id"

export function getRealtimeClientIdFromRequest(
  request: Request
): string | undefined {
  const clientId = request.headers.get(REALTIME_CLIENT_ID_HEADER)?.trim()
  return clientId && clientId.length <= 128 ? clientId : undefined
}

export function getRealtimeRequestIdFromRequest(
  request: Request
): string | undefined {
  const requestId = request.headers.get(REALTIME_REQUEST_ID_HEADER)?.trim()
  return requestId && requestId.length <= 128 ? requestId : undefined
}

// 事件名称常量
export const COLLABORATION_EVENTS = {
  // 成员管理
  MEMBER_JOINED: "member-joined",
  MEMBER_LEFT: "member-left",
  MEMBERS_SYNC: "members-sync",

  // 题目锁定
  QUESTION_LOCKED: "question-locked",
  QUESTION_LOCK_RENEWED: "question-lock-renewed",
  QUESTION_UNLOCKED: "question-unlocked",
  QUESTIONS_UNLOCK_ALL: "questions-unlock-all",

  // 题目更新
  QUESTION_UPDATED: "question-updated",
  QUESTION_CREATED: "question-created",
  QUESTION_DELETED: "question-deleted",
  QUESTIONS_REORDERED: "questions-reordered",

  // 问卷更新
  SURVEY_UPDATED: "survey-updated",
  SURVEY_PUBLISHED: "survey-published",
} as const

// 成员信息类型
export type MemberInfo = {
  userId: string
  name: string | null
  image: string | null
  joinedAt: string
}

// 锁定信息类型
export type LockInfo = {
  questionId: string
  userId: string
  userName: string | null
  lockedAt: string
  lockClientId: string
  lockId: string
  lockExpiresAt: string
  leaseRemainingMs: number
  clientExpiresAt?: number
}

// 题目数据类型（用于实时同步）
export type QuestionData = {
  id: string
  type: string
  title: string
  description?: string
  required: boolean
  order: number
  revision?: number
  config: Record<string, unknown>
}

export type QuestionOrderData = Pick<QuestionData, "id" | "order">

// 问卷数据类型（用于实时同步）
export type SurveyData = {
  title: string
  description?: string | null
  settings?: Record<string, unknown> | null
  detailsRevision?: number
}

// 实时同步事件数据类型
export type SyncEventData = {
  requestId?: string
  clientId?: string
  questionId?: string
  question?: QuestionData
  questions?: Array<QuestionData | QuestionOrderData>
  structureRevision?: number
  survey?: SurveyData
  fromUserId: string
  timestamp: string
}
