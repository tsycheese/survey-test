import { z } from "zod"

// 选项 Schema
export const optionSchema = z.object({
  id: z.string(),
  label: z.string(),
})

// 题目配置 Schema（单选题）
export const singleChoiceConfigSchema = z.object({
  options: z.array(optionSchema),
  columns: z.number().optional().default(1),
})

// 题目配置 Schema（多选题）
export const multipleChoiceConfigSchema = z.object({
  options: z.array(optionSchema),
  columns: z.number().optional().default(1),
})

// 题目配置 Schema（文本题）
export const textConfigSchema = z.object({
  placeholder: z.string().optional(),
  maxLength: z.number().optional(),
})

// 题目配置 Schema（评分题）
export const ratingConfigSchema = z.object({
  max: z.number().optional().default(5),
  step: z.number().optional().default(1),
})

// 题目类型联合
export const questionTypeSchema = z.enum([
  "SINGLE_CHOICE",
  "MULTIPLE_CHOICE",
  "TEXT",
  "RATING",
  "DROPDOWN",
  "TEXTAREA",
  "NUMBER",
  "NPS",
  "CES",
  "PHONE",
  "EMAIL",
  "DATE",
  "RANKING",
  "GENDER",
  "NAME",
  "BIRTHDAY",
  "TIME",
  "MATRIX_SINGLE",
  "MATRIX_SCALE",
])

// 完整题目 Schema
export const questionSchema = z.object({
  id: z.string(),
  type: questionTypeSchema,
  title: z.string(),
  required: z.boolean().optional().default(false),
  order: z.number(),
  config: z.union([
    singleChoiceConfigSchema,
    multipleChoiceConfigSchema,
    textConfigSchema,
    ratingConfigSchema,
  ]),
})

// AI 生成结果 Schema
export const generateQuestionsResultSchema = z.array(questionSchema)

export type QuestionType = z.infer<typeof questionTypeSchema>
export type Question = z.infer<typeof questionSchema>
