import Pusher from "pusher"

// 服务端 Pusher 实例
export const pusherServer = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
  useTLS: true,
})

// 频道名称工具函数（使用 Presence Channel）
export const getSurveyChannel = (surveyId: string) =>
  `presence-survey-${surveyId}`

// 事件名称常量
export const COLLABORATION_EVENTS = {
  // 成员管理
  MEMBER_JOINED: "member-joined",
  MEMBER_LEFT: "member-left",
  MEMBERS_SYNC: "members-sync",

  // 题目锁定
  QUESTION_LOCKED: "question-locked",
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
}

// 题目数据类型（用于实时同步）
export type QuestionData = {
  id: string
  type: string
  title: string
  description?: string
  required: boolean
  order: number
  config: Record<string, unknown>
}

// 问卷数据类型（用于实时同步）
export type SurveyData = {
  title: string
  description?: string | null
  settings?: Record<string, unknown>
}

// 实时同步事件数据类型
export type SyncEventData = {
  questionId?: string
  question?: QuestionData
  questions?: QuestionData[]
  survey?: SurveyData
  fromUserId: string
  timestamp: string
}
