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
import { rankingDef } from "@/components/questions/ranking"
import { genderDef } from "@/components/questions/gender"
import { nameDef } from "@/components/questions/name"
import { birthdayDef } from "@/components/questions/birthday"
import { timeDef } from "@/components/questions/time"
import { matrixSingleDef } from "@/components/questions/matrix-single"
import { matrixScaleDef } from "@/components/questions/matrix-scale"
import type { Question, QuestionDef, QuestionType } from "@/lib/questions/types"

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
  // 新增题型
  RANKING: rankingDef as QuestionDef,
  GENDER: genderDef as QuestionDef,
  NAME: nameDef as QuestionDef,
  BIRTHDAY: birthdayDef as QuestionDef,
  TIME: timeDef as QuestionDef,
  MATRIX_SINGLE: matrixSingleDef as QuestionDef,
  MATRIX_SCALE: matrixScaleDef as QuestionDef,
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
