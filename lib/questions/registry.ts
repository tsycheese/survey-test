import { singleChoiceDef } from "@/components/questions/single-choice"
import { multipleChoiceDef } from "@/components/questions/multiple-choice"
import { textDef } from "@/components/questions/text"
import { ratingDef } from "@/components/questions/rating"
import type { Question, QuestionDef, QuestionType } from "@/lib/questions/types"

export const QUESTION_REGISTRY: Record<QuestionType, QuestionDef> = {
  SINGLE_CHOICE: singleChoiceDef as QuestionDef,
  MULTIPLE_CHOICE: multipleChoiceDef as QuestionDef,
  TEXT: textDef as QuestionDef,
  RATING: ratingDef as QuestionDef,
}

export const QUESTION_DEFS = Object.values(QUESTION_REGISTRY)

export function getQuestionDef(type: QuestionType): QuestionDef {
  return QUESTION_REGISTRY[type]
}

export function createQuestion(type: QuestionType, order: number): Question {
  return QUESTION_REGISTRY[type].defaultQuestion(order) as Question
}
