import { z } from "zod"

// ============ 基础类型 ============
export const optionSchema = z.object({
  id: z.string(),
  label: z.string().min(1, "选项标签不能为空"),
})

export const matrixRowSchema = z.object({
  id: z.string(),
  label: z.string().min(1, "行标签不能为空"),
})

export const matrixColumnSchema = z.object({
  id: z.string(),
  label: z.string().min(1, "列标签不能为空"),
})

// ============ 题目配置 Schema ============

// 单选题
export const singleChoiceConfigSchema = z.object({
  options: z
    .array(optionSchema)
    .min(2, "单选题至少需要 2 个选项")
    .max(10, "单选题最多 10 个选项"),
  columns: z.number().min(1).max(4).optional().default(1),
})

// 多选题
export const multipleChoiceConfigSchema = z.object({
  options: z
    .array(optionSchema)
    .min(2, "多选题至少需要 2 个选项")
    .max(10, "多选题最多 10 个选项"),
  columns: z.number().min(1).max(4).optional().default(1),
  maxSelect: z.number().optional(),
  minSelect: z.number().optional(),
})

// 下拉选择
export const dropdownConfigSchema = z.object({
  options: z
    .array(optionSchema)
    .min(2, "下拉题至少需要 2 个选项")
    .max(10, "下拉题最多 10 个选项"),
  placeholder: z.string().optional(),
})

// 排序题
export const rankingConfigSchema = z.object({
  options: z
    .array(optionSchema)
    .min(2, "排序题至少需要 2 个选项")
    .max(8, "排序题最多 8 个选项"),
})

// 矩阵单选
export const matrixSingleConfigSchema = z.object({
  rows: z
    .array(matrixRowSchema)
    .min(2, "矩阵题至少需要 2 行")
    .max(8, "矩阵题最多 8 行"),
  columns: z
    .array(matrixColumnSchema)
    .min(2, "矩阵题至少需要 2 列")
    .max(6, "矩阵题最多 6 列"),
})

// 文本题
export const textConfigSchema = z.object({
  placeholder: z.string().optional(),
})

// 多行文本
export const textareaConfigSchema = z.object({
  placeholder: z.string().optional(),
  maxLength: z.number().optional(),
})

// 数字题
export const numberConfigSchema = z.object({
  placeholder: z.string().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
})

// 评分题
export const ratingConfigSchema = z.object({
  min: z.number().default(1),
  max: z.number().min(2).max(10),
  minLabel: z.string().optional(),
  maxLabel: z.string().optional(),
})

// NPS
export const npsConfigSchema = z.object({
  min: z.number().default(0),
  max: z.number().default(10),
  lowLabel: z.string().optional(),
  highLabel: z.string().optional(),
})

// CES
export const cesConfigSchema = z.object({
  min: z.number().default(1),
  max: z.number().default(5),
  lowLabel: z.string().optional(),
  highLabel: z.string().optional(),
})

// 姓名
export const nameConfigSchema = z.object({
  placeholder: z.string().optional(),
})

// 性别
export const genderConfigSchema = z.object({
  options: z.array(optionSchema).optional(),
})

// 生日
export const birthdayConfigSchema = z.object({
  format: z
    .enum(["YYYY-MM-DD", "MM-DD", "YYYY"])
    .optional()
    .default("YYYY-MM-DD"),
})

// 电话
export const phoneConfigSchema = z.object({
  placeholder: z.string().optional(),
})

// 邮箱
export const emailConfigSchema = z.object({
  placeholder: z.string().optional(),
})

// 日期时间
export const dateTimeConfigSchema = z.object({
  format: z
    .enum(["YYYY-MM-DD HH:mm", "YYYY-MM-DD", "YYYY-MM", "YYYY", "HH:mm"])
    .optional()
    .default("YYYY-MM-DD"),
})

// ============ AI 生成题目 Schema（Discriminated Union） ============

export const aiQuestionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("SINGLE_CHOICE"),
    title: z.string().min(1, "标题不能为空"),
    description: z.string().optional(),
    required: z.boolean().default(false),
    config: singleChoiceConfigSchema,
  }),
  z.object({
    type: z.literal("MULTIPLE_CHOICE"),
    title: z.string().min(1, "标题不能为空"),
    description: z.string().optional(),
    required: z.boolean().default(false),
    config: multipleChoiceConfigSchema,
  }),
  z.object({
    type: z.literal("DROPDOWN"),
    title: z.string().min(1, "标题不能为空"),
    description: z.string().optional(),
    required: z.boolean().default(false),
    config: dropdownConfigSchema,
  }),
  z.object({
    type: z.literal("RANKING"),
    title: z.string().min(1, "标题不能为空"),
    description: z.string().optional(),
    required: z.boolean().default(false),
    config: rankingConfigSchema,
  }),
  z.object({
    type: z.literal("MATRIX_SINGLE"),
    title: z.string().min(1, "标题不能为空"),
    description: z.string().optional(),
    required: z.boolean().default(false),
    config: matrixSingleConfigSchema,
  }),
  z.object({
    type: z.literal("TEXT"),
    title: z.string().min(1, "标题不能为空"),
    description: z.string().optional(),
    required: z.boolean().default(false),
    config: textConfigSchema,
  }),
  z.object({
    type: z.literal("TEXTAREA"),
    title: z.string().min(1, "标题不能为空"),
    description: z.string().optional(),
    required: z.boolean().default(false),
    config: textareaConfigSchema,
  }),
  z.object({
    type: z.literal("NUMBER"),
    title: z.string().min(1, "标题不能为空"),
    description: z.string().optional(),
    required: z.boolean().default(false),
    config: numberConfigSchema,
  }),
  z.object({
    type: z.literal("RATING"),
    title: z.string().min(1, "标题不能为空"),
    description: z.string().optional(),
    required: z.boolean().default(false),
    config: ratingConfigSchema,
  }),
  z.object({
    type: z.literal("NPS"),
    title: z.string().min(1, "标题不能为空"),
    description: z.string().optional(),
    required: z.boolean().default(false),
    config: npsConfigSchema,
  }),
  z.object({
    type: z.literal("CES"),
    title: z.string().min(1, "标题不能为空"),
    description: z.string().optional(),
    required: z.boolean().default(false),
    config: cesConfigSchema,
  }),
  z.object({
    type: z.literal("NAME"),
    title: z.string().min(1, "标题不能为空"),
    description: z.string().optional(),
    required: z.boolean().default(false),
    config: nameConfigSchema,
  }),
  z.object({
    type: z.literal("GENDER"),
    title: z.string().min(1, "标题不能为空"),
    description: z.string().optional(),
    required: z.boolean().default(false),
    config: genderConfigSchema,
  }),
  z.object({
    type: z.literal("BIRTHDAY"),
    title: z.string().min(1, "标题不能为空"),
    description: z.string().optional(),
    required: z.boolean().default(false),
    config: birthdayConfigSchema,
  }),
  z.object({
    type: z.literal("PHONE"),
    title: z.string().min(1, "标题不能为空"),
    description: z.string().optional(),
    required: z.boolean().default(false),
    config: phoneConfigSchema,
  }),
  z.object({
    type: z.literal("EMAIL"),
    title: z.string().min(1, "标题不能为空"),
    description: z.string().optional(),
    required: z.boolean().default(false),
    config: emailConfigSchema,
  }),
  z.object({
    type: z.literal("DATETIME"),
    title: z.string().min(1, "标题不能为空"),
    description: z.string().optional(),
    required: z.boolean().default(false),
    config: dateTimeConfigSchema,
  }),
])

// ============ AI 生成结果 Schema ============

export const aiGenerateResultSchema = z.object({
  surveyTitle: z.string().min(1, "问卷标题不能为空"),
  surveyDescription: z.string().optional(),
  questions: z
    .array(aiQuestionSchema)
    .min(1, "至少需要 1 道题目")
    .max(20, "最多 20 道题目"),
})

export type AIGenerateResult = z.infer<typeof aiGenerateResultSchema>
export type AIQuestion = z.infer<typeof aiQuestionSchema>
