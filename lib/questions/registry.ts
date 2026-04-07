import { singleChoiceDef } from "@/components/questions/single-choice"
import { multipleChoiceDef } from "@/components/questions/multiple-choice"
import { textDef } from "@/components/questions/text"
import { ratingDef } from "@/components/questions/rating"
import { dropdownDef } from "@/components/questions/dropdown"
import { textareaDef } from "@/components/questions/textarea"
import { numberDef } from "@/components/questions/number"
import { npsDef } from "@/components/questions/nps"
import { cesDef } from "@/components/questions/ces"
import { phoneDef } from "@/components/questions/phone"
import { emailDef } from "@/components/questions/email"
import { dateDef } from "@/components/questions/date"
import type { Question, QuestionDef, QuestionType } from "@/lib/questions/types"

// 注意：RANKING, MATRIX_SINGLE, MATRIX_SCALE, NAME, GENDER, BIRTHDAY, TIME 题型待实现
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const placeholderDef: any = null

export const QUESTION_REGISTRY: Record<QuestionType, QuestionDef> = {
  SINGLE_CHOICE: singleChoiceDef as QuestionDef,
  MULTIPLE_CHOICE: multipleChoiceDef as QuestionDef,
  TEXT: textDef as QuestionDef,
  RATING: ratingDef as QuestionDef,
  DROPDOWN: dropdownDef as QuestionDef,
  TEXTAREA: textareaDef as QuestionDef,
  NUMBER: numberDef as QuestionDef,
  NPS: npsDef as QuestionDef,
  CES: cesDef as QuestionDef,
  PHONE: phoneDef as QuestionDef,
  EMAIL: emailDef as QuestionDef,
  DATE: dateDef as QuestionDef,
  // 以下题型待实现
  RANKING: placeholderDef,
  MATRIX_SINGLE: placeholderDef,
  MATRIX_SCALE: placeholderDef,
  NAME: placeholderDef,
  GENDER: placeholderDef,
  BIRTHDAY: placeholderDef,
  TIME: placeholderDef,
} as const

export const QUESTION_DEFS = Object.values(QUESTION_REGISTRY).filter(Boolean)

export function getQuestionDef(type: QuestionType): QuestionDef {
  const def = QUESTION_REGISTRY[type]
  if (!def) {
    throw new Error(`Unknown question type: ${type}`)
  }
  return def
}

export function createQuestion(type: QuestionType, order: number): Question {
  return getQuestionDef(type).defaultQuestion(order) as Question
}
