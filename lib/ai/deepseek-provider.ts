import { createOpenAICompatible } from "@ai-sdk/openai-compatible"

/**
 * DeepSeek provider 配置
 * DeepSeek 兼容 OpenAI API 格式
 */
const deepseek = createOpenAICompatible({
  name: "deepseek",
  baseURL: "https://api.deepseek.com/v1",
  headers: {
    Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
  },
})

export const deepseekChat = deepseek("deepseek-chat")
