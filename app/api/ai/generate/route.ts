import { NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { deepseekChat } from "@/lib/ai/deepseek-provider"
import { SYSTEM_PROMPT, createUserPrompt } from "@/lib/ai/prompt"
import { nanoid } from "nanoid"

/**
 * AI 生成问卷题目 API
 * POST /api/ai/generate
 * Body: { input: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { input } = body

    if (!input || typeof input !== "string") {
      return NextResponse.json({ error: "请输入问卷需求" }, { status: 400 })
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
    console.log("AI 返回原始内容:", text)

    // 提取 JSON 部分（可能包含在 ```json 代码块中）
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
    const jsonString = jsonMatch ? jsonMatch[1].trim() : text

    console.log("提取的 JSON:", jsonString)

    const parsed = JSON.parse(jsonString)

    if (!Array.isArray(parsed)) {
      throw new Error("AI 返回的不是数组")
    }

    // 转换并验证每个题目
    const questions = parsed.map(
      (q: Record<string, unknown>, index: number) => {
        const type = ((q.type as string) || "TEXT").toUpperCase()

        // 转换 options 格式（支持简单数组和对象数组）
        let options: Array<{ id: string; label: string }> = []
        if (Array.isArray(q.options)) {
          options = q.options.map((opt: unknown) =>
            typeof opt === "string"
              ? { id: nanoid(), label: opt }
              : {
                  id:
                    ((opt as Record<string, unknown>).id as string) || nanoid(),
                  label:
                    ((opt as Record<string, unknown>).label as string) ||
                    (opt as string),
                }
          )
        }

        // 为单选题/多选题生成默认选项（如果没有提供）
        if (
          (type === "SINGLE_CHOICE" || type === "MULTIPLE_CHOICE") &&
          options.length === 0
        ) {
          options = [
            { id: nanoid(), label: "选项 1" },
            { id: nanoid(), label: "选项 2" },
            { id: nanoid(), label: "选项 3" },
          ]
        }

        return {
          id: nanoid(), // 始终使用 nanoid 生成唯一 ID
          type: type,
          title: (q.title as string) || (q.question as string) || "新问题",
          required: (q.required as boolean) ?? false,
          order: index + 1,
          config: {
            // 单选题/多选题必须有 options
            ...(type === "SINGLE_CHOICE" || type === "MULTIPLE_CHOICE"
              ? { options }
              : {}),
            columns:
              ((q.config as Record<string, unknown>)?.columns as number) ||
              (q.columns as number) ||
              1,
            // 文本题配置
            ...(type === "TEXT"
              ? {
                  placeholder:
                    ((q.config as Record<string, unknown>)
                      ?.placeholder as string) || (q.placeholder as string),
                  maxLength:
                    ((q.config as Record<string, unknown>)
                      ?.maxLength as number) || (q.maxLength as number),
                }
              : {}),
            // 评分题配置
            ...(type === "RATING"
              ? {
                  max:
                    ((q.config as Record<string, unknown>)?.max as number) ||
                    (q.max as number) ||
                    5,
                  step:
                    ((q.config as Record<string, unknown>)?.step as number) ||
                    (q.step as number) ||
                    1,
                }
              : {}),
          },
        }
      }
    )

    console.log("转换后的题目:", questions)

    return NextResponse.json({ questions })
  } catch (error) {
    console.error("AI 生成失败:", error)

    if (error instanceof Error) {
      return NextResponse.json(
        { error: "生成失败", details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ error: "生成失败" }, { status: 500 })
  }
}
