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
import { dateTimeDef } from "@/components/questions/datetime"
import { rankingDef } from "@/components/questions/ranking"
import { genderDef } from "@/components/questions/gender"
import { nameDef } from "@/components/questions/name"
import { birthdayDef } from "@/components/questions/birthday"
import { matrixSingleDef } from "@/components/questions/matrix-single"
import { imageSingleChoiceDef } from "@/components/questions/image-single-choice"
import { imageMultipleChoiceDef } from "@/components/questions/image-multiple-choice"
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
  DATETIME: dateTimeDef as QuestionDef,
  // 新增题型
  RANKING: rankingDef as QuestionDef,
  GENDER: genderDef as QuestionDef,
  NAME: nameDef as QuestionDef,
  BIRTHDAY: birthdayDef as QuestionDef,
  MATRIX_SINGLE: matrixSingleDef as QuestionDef,
  // 图片题型
  IMAGE_SINGLE_CHOICE: imageSingleChoiceDef as QuestionDef,
  IMAGE_MULTIPLE_CHOICE: imageMultipleChoiceDef as QuestionDef,
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
