import { streamObject } from "ai"
import { deepseekChat } from "@/lib/ai/deepseek-provider"
import { SYSTEM_PROMPT, createUserPrompt } from "@/lib/ai/prompt"
import { aiGenerateResultSchema } from "@/lib/ai/schema"

/**
 * AI 生成问卷题目流式 API
 * POST /api/ai/generate-stream
 * Body: { input: string }
 */
export async function POST(request: Request) {
  const body = await request.json()
  const { input } = body

  if (!input || typeof input !== "string" || input.trim().length < 5) {
    return new Response(
      JSON.stringify({ error: "请输入有效的问卷需求描述（至少 5 个字符）" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    )
  }

  if (!process.env.DEEPSEEK_API_KEY) {
    return new Response(
      JSON.stringify({
        error:
          "未配置 DeepSeek API Key，请在 .env.local 中配置 DEEPSEEK_API_KEY",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }

  const result = await streamObject({
    model: deepseekChat,
    schema: aiGenerateResultSchema,
    system: SYSTEM_PROMPT,
    prompt: createUserPrompt(input),
  })

  return result.toTextStreamResponse()
}
