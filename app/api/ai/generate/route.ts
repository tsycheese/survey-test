import { NextRequest, NextResponse } from "next/server"
import { generateObject } from "ai"
import { deepseekChat } from "@/lib/ai/deepseek-provider"
import { SYSTEM_PROMPT, createUserPrompt } from "@/lib/ai/prompt"
import { aiGenerateResultSchema, type AIGenerateResult } from "@/lib/ai/schema"
import { nanoid } from "nanoid"

/**
 * 为 AI 生成的题目补充 id 和 order
 */
function enrichQuestions(result: AIGenerateResult) {
  return {
    surveyTitle: result.surveyTitle,
    surveyDescription: result.surveyDescription,
    questions: result.questions.map((q, index) => ({
      ...q,
      id: nanoid(),
      order: index + 1,
    })),
  }
}

/**
 * AI 生成问卷题目 API（增强版）
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

    // 调用 AI 结构化生成
    const { object } = await generateObject({
      model: deepseekChat,
      schema: aiGenerateResultSchema,
      system: SYSTEM_PROMPT,
      prompt: createUserPrompt(input),
    })

    // 补充 id 和 order
    const enriched = enrichQuestions(object)

    console.log(
      "AI 生成成功:",
      enriched.surveyTitle,
      `- ${enriched.questions.length} 道题目`
    )

    return NextResponse.json(enriched)
  } catch (error) {
    console.error("AI 生成失败:", error)

    if (error instanceof Error) {
      // 结构化生成失败时的常见错误
      if (
        error.message.includes("No object generated") ||
        error.message.includes("parse")
      ) {
        return NextResponse.json(
          { error: "AI 返回的数据格式不正确，请重试或简化描述" },
          { status: 500 }
        )
      }

      return NextResponse.json(
        { error: "生成失败", details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ error: "生成失败" }, { status: 500 })
  }
}
