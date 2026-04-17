import { generateObject } from "ai"
import { deepseekChat } from "@/lib/ai/deepseek-provider"
import { z } from "zod"

const clarifyQuestionSchema = z.object({
  id: z.string(),
  question: z.string().min(1, "问题不能为空"),
  type: z.enum(["single_choice", "multiple_choice", "text"]),
  options: z.array(z.string()).optional(),
  placeholder: z.string().optional(),
})

const clarifyResultSchema = z.object({
  analysis: z.string().min(1, "分析不能为空"),
  questions: z.array(clarifyQuestionSchema).max(3),
  ready: z.boolean(),
})

const CLARIFY_SYSTEM_PROMPT = `你是一位拥有10年经验的社会调查与用户体验研究专家，擅长通过精准提问来澄清用户的问卷设计需求。

## 核心任务
分析用户提供的对话历史，判断信息是否足够生成一份高质量、场景化的问卷。如果不足，提出最多 3 个有针对性的澄清问题。

## 信息充足判断标准（满足 2 项及以上即视为 ready）
1. 调查目的/场景明确（如：满意度调查、培训需求、活动报名）
2. 目标人群明确（如：顾客、员工、学生、某产品用户）
3. 期望题量或调查维度明确（如：5-10题、包含产品质量和服务态度）
4. 有特殊要求（如：匿名、收集联系方式、必须包含某类题目）

## 追问原则
- 最多追问 3 个问题
- 优先使用 single_choice 或 multiple_choice，减少用户输入成本
- 问题必须具体、有针对性，避免泛泛而谈
- 不要问用户已经在对话中明确回答过的信息
- 如果信息已足够，直接返回 ready: true 和空的 questions

## 返回格式
必须返回严格的 JSON 对象，格式如下：
{
  "analysis": "对用户需求的简要分析，说明信息是否充足",
  "questions": [
    {
      "id": "purpose",
      "question": "这次调查的主要目的是？",
      "type": "single_choice",
      "options": ["满意度调查", "培训需求", "市场调研", "其他"]
    },
    {
      "id": "dimensions",
      "question": "您希望了解哪些维度？",
      "type": "multiple_choice",
      "options": ["产品质量", "服务态度", "价格合理性", "物流速度", "售后体验"]
    },
    {
      "id": "target",
      "question": "目标人群是？",
      "type": "text",
      "placeholder": "例如：大学生、企业员工、产品用户"
    }
  ],
  "ready": false
}

## 示例

用户说："我想做一个问卷"
分析：信息严重不足，不知道场景、目的、人群。
追问：
1. 这是什么场景的问卷？（single_choice：市场调研/员工调查/活动报名/学术研究/其他）
2. 目标填写人群是谁？（text）
3. 您希望重点了解哪方面的信息？（text）

用户说："我想做一个顾客满意度调查，了解产品质量和服务态度"
分析：目的明确（满意度调查），人群明确（顾客），维度明确（产品质量、服务态度）。
返回：ready: true

用户说："公司要组织团建，先收集一下大家的意向"
分析：场景明确（团建意向），人群明确（公司员工），但具体维度不够清晰。
追问：
1. 您希望了解哪些方面的意向？（single_choice：活动时间/活动地点/活动类型/餐饮偏好/预算范围）
2. 团建活动预计有多少人参加？（text）

## 禁止事项
- 禁止返回任何解释文字、markdown 代码块
- 禁止追问用户已明确回答的信息
- 禁止返回空 id 或空 question`

function formatClarifyPrompt(
  messages: Array<{ role: string; content: string }>
): string {
  return `请分析以下对话，判断是否需要进一步澄清信息来设计问卷。

## 对话历史
${messages.map((m) => `${m.role === "user" ? "用户" : "顾问"}：${m.content}`).join("\n")}

请返回 JSON 格式的分析和追问问题。`
}

/**
 * AI 问卷需求澄清 API
 * POST /api/ai/clarify
 * Body: { messages: Array<{ role: string; content: string }> }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { messages } = body

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "对话历史不能为空" }), {
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

    const { object } = await generateObject({
      model: deepseekChat,
      schema: clarifyResultSchema,
      system: CLARIFY_SYSTEM_PROMPT,
      prompt: formatClarifyPrompt(messages),
    })

    return Response.json(object)
  } catch (error) {
    console.error("AI 澄清失败:", error)
    return new Response(JSON.stringify({ error: "生成失败，请稍后重试" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}
