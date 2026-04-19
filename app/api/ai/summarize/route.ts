import { streamText } from "ai"
import { deepseekChat } from "@/lib/ai/deepseek-provider"
import { auth } from "@/lib/auth"

const SUMMARIZE_SYSTEM_PROMPT = `你是一位专业的数据分析师，擅长从问卷数据中提炼洞察。请根据提供的问卷题目和回答数据，生成一份结构清晰、有洞察力的数据总结报告。

## 输出要求
1. 使用 Markdown 格式输出
2. 报告结构：
   - # 数据洞察报告（问卷标题）
   - ## 调查概况（回收量、有效回答率等）
   - ## 核心发现（3-5 条关键洞察，每条配具体数据支撑）
   - ## 各题分析（按题目逐一分析，突出重点选项的占比和趋势）
   - ## 建议与结论（基于数据给出 actionable 的建议）
3. 语言风格：专业、简洁、有数据支撑，避免空泛描述
4. 对于文本题，提取高频关键词和代表性观点
5. 对于评分题，计算平均分并给出评价
6. 对于矩阵题，按维度对比分析

## 注意事项
- 不要编造数据，所有结论必须基于提供的实际数据
- 如果某题回答量很少，可以标注"样本量较小，仅供参考"
- 保持客观中立，不要过度解读`

function formatSurveyData(data: {
  surveyTitle: string
  totalResponses: number
  questions: Array<{
    title: string
    type: string
    answers: unknown[]
    config?: Record<string, unknown> | null
  }>
}): string {
  const lines: string[] = []
  lines.push(`问卷标题：${data.surveyTitle}`)
  lines.push(`总回收量：${data.totalResponses} 份`)
  lines.push("")
  lines.push("=".repeat(40))
  lines.push("")

  data.questions.forEach((q, idx) => {
    lines.push(`【第 ${idx + 1} 题】${q.title}`)
    lines.push(`题型：${q.type}`)

    const answers = q.answers
    const validAnswers = answers.filter(
      (a) => a !== null && a !== "" && a !== undefined
    )
    lines.push(`有效回答：${validAnswers.length} / ${data.totalResponses}`)

    if (validAnswers.length === 0) {
      lines.push("（无有效回答）")
      lines.push("")
      return
    }

    // 选择题：统计各选项频次
    const choiceTypes = [
      "SINGLE_CHOICE",
      "MULTIPLE_CHOICE",
      "DROPDOWN",
      "RANKING",
      "GENDER",
      "IMAGE_SINGLE_CHOICE",
      "IMAGE_MULTIPLE_CHOICE",
    ]
    if (choiceTypes.includes(q.type)) {
      const options =
        (q.config?.options as Array<{ id: string; label: string }>) || []
      const counts: Record<string, number> = {}
      validAnswers.forEach((a) => {
        if (Array.isArray(a)) {
          a.forEach((v) => {
            counts[String(v)] = (counts[String(v)] || 0) + 1
          })
        } else {
          counts[String(a)] = (counts[String(a)] || 0) + 1
        }
      })

      const matchKey = q.type === "GENDER" ? "id" : "label"
      options.forEach((opt) => {
        const key = opt[matchKey]
        const count = counts[key] || 0
        const pct = ((count / validAnswers.length) * 100).toFixed(1)
        lines.push(`  - ${opt.label}：${count} 人（${pct}%）`)
      })

      // 其他未匹配到的值
      const knownKeys = new Set(options.map((o) => o[matchKey]))
      Object.entries(counts).forEach(([key, count]) => {
        if (!knownKeys.has(key)) {
          const pct = ((count / validAnswers.length) * 100).toFixed(1)
          lines.push(`  - 其他（${key}）：${count} 人（${pct}%）`)
        }
      })
    }

    // 评分题 / NPS / CES / NUMBER
    if (["RATING", "NPS", "CES", "NUMBER"].includes(q.type)) {
      const nums = validAnswers.map((a) => Number(a)).filter((n) => !isNaN(n))
      if (nums.length > 0) {
        const avg = (nums.reduce((s, n) => s + n, 0) / nums.length).toFixed(2)
        const min = Math.min(...nums)
        const max = Math.max(...nums)
        lines.push(`  平均分：${avg}，最低：${min}，最高：${max}`)

        // 分布
        const dist: Record<string, number> = {}
        nums.forEach((n) => {
          dist[String(n)] = (dist[String(n)] || 0) + 1
        })
        Object.entries(dist)
          .sort(([a], [b]) => Number(a) - Number(b))
          .forEach(([val, count]) => {
            const pct = ((count / nums.length) * 100).toFixed(1)
            lines.push(`  - ${val} 分：${count} 人（${pct}%）`)
          })
      }
    }

    // 矩阵单选
    if (q.type === "MATRIX_SINGLE") {
      const rows =
        (q.config?.rows as Array<{ id: string; label: string }>) || []
      const cols =
        (q.config?.columns as Array<{ id: string; label: string }>) || []
      const rowCounts: Record<string, Record<string, number>> = {}
      validAnswers.forEach((a) => {
        if (a && typeof a === "object" && !Array.isArray(a)) {
          Object.entries(a as Record<string, string>).forEach(
            ([rowId, colId]) => {
              if (!rowCounts[rowId]) rowCounts[rowId] = {}
              rowCounts[rowId][colId] = (rowCounts[rowId][colId] || 0) + 1
            }
          )
        }
      })

      rows.forEach((row) => {
        lines.push(`  ${row.label}：`)
        const rc = rowCounts[row.id] || {}
        cols.forEach((col) => {
          const count = rc[col.id] || 0
          const pct = ((count / validAnswers.length) * 100).toFixed(1)
          lines.push(`    - ${col.label}：${count} 人（${pct}%）`)
        })
      })
    }

    // 文本题
    if (["TEXT", "TEXTAREA", "NAME", "EMAIL", "PHONE"].includes(q.type)) {
      const texts = validAnswers
        .map((a) => String(a).trim())
        .filter((t) => t.length > 0)
      if (texts.length > 0) {
        lines.push(`  回答示例（前 10 条）：`)
        texts.slice(0, 10).forEach((t) => {
          lines.push(`    - ${t}`)
        })
        if (texts.length > 10) {
          lines.push(`    ... 共 ${texts.length} 条回答`)
        }
      }
    }

    lines.push("")
  })

  return lines.join("\n")
}

/**
 * AI 数据总结流式 API
 * POST /api/ai/summarize
 * Body: { surveyTitle, totalResponses, questions }
 */
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return new Response(JSON.stringify({ error: "未登录" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })
    }

    const body = await request.json()
    const { surveyTitle, totalResponses, questions } = body

    if (!questions || !Array.isArray(questions)) {
      return new Response(JSON.stringify({ error: "问卷数据不能为空" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
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

    const dataText = formatSurveyData({
      surveyTitle,
      totalResponses,
      questions,
    })

    const result = streamText({
      model: deepseekChat,
      system: SUMMARIZE_SYSTEM_PROMPT,
      prompt: dataText,
    })

    return result.toTextStreamResponse()
  } catch (error) {
    console.error("AI 总结失败:", error)
    return new Response(JSON.stringify({ error: "生成失败，请稍后重试" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}
