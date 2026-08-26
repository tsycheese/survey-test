import "server-only"

import { z } from "zod"
import type { Prisma } from "@/prisma/generated/prisma/client"

export const questionMutationSchema = z.object({
  operationId: z.string().uuid("无效的操作ID"),
  title: z.string().min(1, "题目不能为空"),
  description: z.string().optional(),
  type: z.enum([
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
    "DATETIME",
    "RANKING",
    "GENDER",
    "NAME",
    "BIRTHDAY",
    "MATRIX_SINGLE",
    "IMAGE_SINGLE_CHOICE",
    "IMAGE_MULTIPLE_CHOICE",
  ]),
  required: z.boolean().default(false),
  order: z.number().int().nonnegative().optional(),
  config: z
    .record(z.unknown())
    .optional()
    .transform((value) => value as Prisma.InputJsonValue | undefined),
})

export const batchQuestionMutationSchema = z
  .object({
    batchId: z.string().uuid("无效的批次ID"),
    expectedStructureRevision: z.number().int().nonnegative(),
    questions: z
      .array(questionMutationSchema.omit({ order: true }))
      .min(1, "至少需要一道题目")
      .max(100, "单次最多添加100道题目"),
  })
  .refine(
    ({ questions }) =>
      new Set(questions.map((question) => question.operationId)).size ===
      questions.length,
    { message: "题目操作ID不能重复", path: ["questions"] }
  )
