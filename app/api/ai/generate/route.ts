import { NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { deepseekChat } from "@/lib/ai/deepseek-provider"
import { SYSTEM_PROMPT, createUserPrompt } from "@/lib/ai/prompt"
import { nanoid } from "nanoid"
import { z } from "zod"

/**
 * AI 返回的原始题目 Schema（宽松的，兼容 AI 的各种输出格式）
 */
const rawQuestionSchema = z.object({
  id: z.string().optional(),
  type: z.string(),
  title: z.string().or(z.undefined()),
  question: z.string().optional(), // 兼容 AI 返回 question 字段
  required: z.boolean().optional(),
  options: z
    .array(
      z.union([
        z.string(),
        z.object({ id: z.string().optional(), label: z.string() }),
      ])
    )
    .optional(),
  config: z.record(z.unknown()).optional(),
  columns: z.number().optional(),
  placeholder: z.string().optional(),
  maxLength: z.number().optional(),
  max: z.number().optional(),
  step: z.number().optional(),
})

/**
 * 校验并转换题目数据
 */
function validateAndTransformQuestion(raw: unknown, index: number) {
  // 第一步：宽松校验，提取原始数据
  const parsed = rawQuestionSchema.safeParse(raw)

  if (!parsed.success) {
    console.error("题目格式校验失败:", parsed.error)
    throw new Error(
      `第 ${index + 1} 道题目格式错误：${parsed.error.errors[0]?.message || "未知错误"}`
    )
  }

  const q = parsed.data
  const type = (q.type || "TEXT").toUpperCase()

  // 校验题目类型
  const validTypes = [
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
  ]
  if (!validTypes.includes(type)) {
    throw new Error(
      `第 ${index + 1} 道题目类型无效：${type}，有效类型为：${validTypes.join(", ")}`
    )
  }

  // 校验题目标题
  const title = q.title || q.question
  if (!title || title.trim().length === 0) {
    throw new Error(`第 ${index + 1} 道题目缺少标题`)
  }

  // 转换 options 格式
  let options: Array<{ id: string; label: string }> = []
  if (Array.isArray(q.options)) {
    options = q.options.map((opt) =>
      typeof opt === "string"
        ? { id: nanoid(), label: opt }
        : { id: opt.id || nanoid(), label: opt.label || String(opt) }
    )
  }

  // 单选题/多选题必须有选项
  if (
    (type === "SINGLE_CHOICE" || type === "MULTIPLE_CHOICE") &&
    options.length === 0
  ) {
    console.warn(`第 ${index + 1} 道题目 (${type}) 缺少选项，生成默认选项`)
    options = [
      { id: nanoid(), label: "选项 1" },
      { id: nanoid(), label: "选项 2" },
      { id: nanoid(), label: "选项 3" },
    ]
  }

  // 校验选项数量
  if (options.length > 0 && options.length < 2) {
    throw new Error(`第 ${index + 1} 道题目选项数量不能少于 2 个`)
  }

  // 校验评分题配置
  if (type === "RATING") {
    const max = (q.config?.max as number) || q.max || 5
    if (max < 1 || max > 10) {
      throw new Error(`第 ${index + 1} 道评分题的 max 值必须在 1-10 之间`)
    }
  }

  // 构建最终题目
  return {
    id: nanoid(), // 始终使用 nanoid 生成唯一 ID
    type,
    title: title.trim(),
    required: q.required ?? false,
    order: index + 1,
    config: {
      // 单选题/多选题必须有 options
      ...(type === "SINGLE_CHOICE" || type === "MULTIPLE_CHOICE"
        ? { options }
        : {}),
      columns: (q.config?.columns as number) || q.columns || 1,
      // 文本题配置
      ...(type === "TEXT"
        ? {
            placeholder:
              (q.config?.placeholder as string) || q.placeholder || undefined,
            maxLength:
              (q.config?.maxLength as number) || q.maxLength || undefined,
          }
        : {}),
      // 评分题配置
      ...(type === "RATING"
        ? {
            max: (q.config?.max as number) || q.max || 5,
            step: (q.config?.step as number) || q.step || 1,
          }
        : {}),
    },
  }
}

/**
 * 题目数量限制
 */
const MAX_QUESTIONS = 20
const MIN_QUESTIONS = 1

/**
 * AI 生成问卷题目 API
 * POST /api/ai/generate
 * Body: { input: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { input } = body

    // 校验输入
    if (!input || typeof input !== "string") {
      return NextResponse.json({ error: "请输入问卷需求" }, { status: 400 })
    }

    if (input.trim().length < 5) {
      return NextResponse.json(
        { error: "请提供更详细的问卷需求描述（至少 5 个字符）" },
        { status: 400 }
      )
    }

    if (!process.env.DEEPSEEK_API_KEY) {
      return NextResponse.json(
        {
          error:
            "未配置 DeepSeek API Key，请在 .env.local 中配置 DEEPSEEK_API_KEY",
        },
        { status: 500 }
      )
    }

    // 调用 AI 生成题目
    const result = await generateText({
      model: deepseekChat,
      system: SYSTEM_PROMPT,
      prompt: createUserPrompt(input),
    })

    // 解析 AI 返回的 JSON
    const text = result.text.trim()
    console.log("AI 返回原始内容:", text.slice(0, 500))

    // 提取 JSON 部分（可能包含在 ```json 代码块中）
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
    const jsonString = jsonMatch ? jsonMatch[1].trim() : text

    const parsed = JSON.parse(jsonString)

    // 校验是否为数组
    if (!Array.isArray(parsed)) {
      throw new Error("AI 返回的不是数组格式")
    }

    // 校验题目数量
    if (parsed.length < MIN_QUESTIONS) {
      throw new Error(`生成的题目数量太少（最少 ${MIN_QUESTIONS} 道）`)
    }
    if (parsed.length > MAX_QUESTIONS) {
      throw new Error(`生成的题目数量太多（最多 ${MAX_QUESTIONS} 道）`)
    }

    // 校验并转换每个题目
    const questions = parsed.map((q, index) =>
      validateAndTransformQuestion(q, index)
    )

    console.log("校验通过的题目:", questions.length)

    return NextResponse.json({ questions })
  } catch (error) {
    console.error("AI 生成失败:", error)

    if (error instanceof Error) {
      // 区分校验错误和其他错误
      if (
        error.message.includes("格式错误") ||
        error.message.includes("类型无效") ||
        error.message.includes("缺少标题") ||
        error.message.includes("选项数量")
      ) {
        return NextResponse.json(
          { error: "AI 返回的数据格式不正确", details: error.message },
          { status: 400 }
        )
      }

      if (error.message.includes("题目数量")) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }

      return NextResponse.json(
        { error: "生成失败", details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ error: "生成失败" }, { status: 500 })
  }
}
