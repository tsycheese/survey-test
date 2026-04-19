# AI 辅助模块

## 模块概述

AI 辅助模块为问卷系统提供基于 DeepSeek 大语言模型的智能化能力，涵盖**问卷自动生成**和**数据智能总结**两大核心场景。模块通过 `ai-sdk` 与 DeepSeek API 交互，采用结构化生成（`generateObject` / `streamObject`）和流式文本生成（`streamText`）两种模式，确保 AI 输出可被程序安全消费。

---

## 核心功能

| 功能 | 说明 |
|------|------|
| **需求澄清** | 多轮对话分析用户意图，信息不足时自动追问，充足时直接生成 |
| **问卷生成** | 根据用户需求输出结构化问卷（含标题、描述、题目数组） |
| **流式生成** | 实时流式输出题目，用户可提前预览并决定中断或继续 |
| **数据总结** | 对问卷回收数据进行统计分析，生成 Markdown 洞察报告 |
| **Schema 校验** | 使用 Zod 对 AI 输出做严格类型校验，避免格式异常 |

---

## 关键文件说明

| 文件 | 职责 |
|------|------|
| `app/api/ai/clarify/route.ts` | 需求澄清 API，判断信息是否足够并返回追问问题 |
| `app/api/ai/generate/route.ts` | 非流式问卷生成 API，返回完整 JSON |
| `app/api/ai/generate-stream/route.ts` | 流式问卷生成 API，使用 `streamObject` 实时推送 |
| `app/api/ai/summarize/route.ts` | 数据总结 API，将问卷数据格式化为文本后流式生成报告 |
| `components/ai/ai-clarify-dialog.tsx` | AI 生成弹窗组件，管理「输入 → 澄清 → 生成」三阶段状态 |
| `app/(editor)/surveys/[id]/results/summary/page.tsx` | AI 总结页面，支持缓存、自动触发、流式渲染 Markdown |
| `lib/ai/prompt.ts` | 系统提示词（SYSTEM_PROMPT）和用户提示词工厂函数 |
| `lib/ai/schema.ts` | Zod Schema 定义，覆盖全部题型的配置校验 |
| `lib/ai/deepseek-provider.ts` | DeepSeek Provider 封装，基于 OpenAI 兼容接口 |

---

## 核心逻辑/流程

### 1. AI 问卷生成流程

```
用户输入需求
    │
    ▼
┌─────────────────┐
│  需求澄清 API    │  ← 分析对话历史，判断信息是否充足
│  /api/ai/clarify │
└─────────────────┘
    │
    ├─ 信息不足 ──► 返回 1-3 个追问问题 ──► 用户回答 ──► 再次调用 clarify
    │                                              （循环最多 2-3 轮）
    └─ 信息充足 ──► 进入生成阶段
                       │
                       ▼
            ┌──────────────────────┐
            │  流式生成 API         │  ← streamObject，实时推送 partial JSON
            │  /api/ai/generate-stream
            └──────────────────────┘
                       │
                       ▼
            前端 useObject 实时解析并渲染题目预览
                       │
                       ▼
            用户点击「确认添加」→ 注入编辑器
```

**关键代码：流式生成 API**

```ts
// app/api/ai/generate-stream/route.ts
import { streamObject } from "ai"
import { deepseekChat } from "@/lib/ai/deepseek-provider"
import { aiGenerateResultSchema } from "@/lib/ai/schema"

export async function POST(request: Request) {
  const { input } = await request.json()

  const result = await streamObject({
    model: deepseekChat,
    schema: aiGenerateResultSchema,   // Zod 约束输出结构
    system: SYSTEM_PROMPT,
    prompt: createUserPrompt(input),
  })

  return result.toTextStreamResponse() // 文本流式响应
}
```

**关键代码：前端实时消费流**

```ts
// components/ai/ai-clarify-dialog.tsx
import { experimental_useObject as useObject } from "@ai-sdk/react"

const { object, submit, isLoading } = useObject({
  api: "/api/ai/generate-stream",
  schema: aiGenerateResultSchema,
})

// object 会在流式传输过程中逐步填充，前端实时渲染
const generatedQuestions = useMemo(() => {
  if (!object?.questions) return []
  return object.questions.map((q, index) => ({
    ...q,
    id: nanoid(),      // 前端补充 id
    order: index + 1,  // 前端补充 order
  }))
}, [object])
```

### 2. AI 数据总结流程

```
结果页加载
    │
    ▼
检查 localStorage 缓存（key: ai-summary:{surveyId}）
    │
    ├─ 缓存命中且 totalResponses 一致 ──► 直接展示缓存内容
    │
    └─ 无缓存或数据已更新 ──► 自动触发生成
                                │
                                ▼
                    格式化问卷数据为纯文本统计报告
                                │
                                ▼
                    调用 /api/ai/summarize（streamText）
                                │
                                ▼
                    流式读取 response.body，逐字追加到 state
                                │
                                ▼
                    生成完成后写入 localStorage
```

**关键代码：数据格式化**

```ts
// app/api/ai/summarize/route.ts
function formatSurveyData(data): string {
  // 按题型分别统计：
  // - 选择题：选项频次 + 百分比
  // - 评分/NPS/NUMBER：平均分、最低、最高、分布
  // - 矩阵单选：按行列交叉统计
  // - 文本题：展示前 10 条回答示例
  // 最终拼接为纯文本，作为 prompt 传给 AI
}
```

**关键代码：前端流式读取**

```ts
// app/(editor)/surveys/[id]/results/summary/page.tsx
const reader = res.body?.getReader()
const decoder = new TextDecoder()
let fullText = ""
while (!done) {
  const { value, done: d } = await reader.read()
  done = d
  if (value) {
    const chunk = decoder.decode(value, { stream: true })
    fullText += chunk
    setContent(fullText) // 逐字更新 UI，实现打字机效果
  }
}
saveCached(id, fullText, data.totalResponses)
```

---

## 数据结构

### AI 生成结果结构

```ts
interface AIGenerateResult {
  surveyTitle: string        // 问卷标题
  surveyDescription?: string // 问卷描述
  questions: AIQuestion[]    // 题目数组（1-20 题）
}

interface AIQuestion {
  type: QuestionType         // 题型枚举，如 SINGLE_CHOICE
  title: string              // 题目标题
  description?: string       // 题目描述
  required: boolean          // 是否必填
  config: QuestionConfig     // 题型专属配置（由 Zod 严格校验）
}
```

### 需求澄清返回结构

```ts
interface ClarifyResult {
  analysis: string           // AI 对用户需求的分析
  questions: Array<{
    id: string
    question: string
    type: "single_choice" | "multiple_choice" | "text"
    options?: string[]
    placeholder?: string
  }>
  ready: boolean             // 信息是否已充足
}
```

### 本地缓存结构

```ts
interface CachedSummary {
  content: string
  timestamp: number          // 生成时间戳
  surveyId: string
  totalResponses: number     // 用于判断缓存是否失效
}

// localStorage key: `ai-summary:{surveyId}`
```

---

## 重要实现细节

### 1. Prompt 设计

**系统提示词（`SYSTEM_PROMPT`）** 位于 `lib/ai/prompt.ts`，核心设计要点：

- **角色设定**：10 年经验的社会调查与 UX 研究专家，提升生成质量。
- **场景化分析**：要求 AI 先理解调查目的、目标人群、使用场景，禁止泛泛而谈。
- **选项质量**：选项必须语义相关、具体、互斥、覆盖全面（MECE 原则），禁止出现「选项 1」「选项 2」占位符。
- **题型策略**：根据问题性质选择最合适题型，不为了多样而多样。
- **题量控制**：用户指定题量时**必须严格遵循**，不得擅自压缩；未指定时默认 3-12 题。
- **配置细节**：评分题必须设置 `minLabel` / `maxLabel`，文本题设置贴合场景的 `placeholder`。
- **示例驱动**：Prompt 中嵌入高质量示例（产品体验调研、活动报名），引导模型输出。

**用户提示词（`createUserPrompt`）**：

```ts
export function createUserPrompt(userInput: string): string {
  return `请根据以下用户需求，设计一份高质量的问卷。

## 用户需求
${userInput}

## 要求
1. 先分析这个需求的调查场景和目标人群
2. 如果用户指定了题目数量，必须严格按该数量生成
3. 根据场景选择最合适的题型组合
4. 所有选项必须有实际意义，贴合主题
5. 返回严格的 JSON 对象格式
6. 不要返回任何解释文字`
}
```

### 2. 流式输出实现

模块使用 `ai-sdk` 的 `streamObject`（问卷生成）和 `streamText`（数据总结）：

| 场景 | SDK 方法 | 前端消费 |
|------|----------|----------|
| 问卷生成 | `streamObject` | `@ai-sdk/react` 的 `useObject` |
| 数据总结 | `streamText` | 原生 `ReadableStream` + `TextDecoder` |

`streamObject` 的优势：在 JSON 尚未完全输出时即可解析部分字段，前端能实时看到题目逐道出现。

### 3. 本地缓存策略

AI 总结页面实现了基于 `localStorage` 的客户端缓存：

- **Key 规则**：`ai-summary:{surveyId}`
- **失效条件**：缓存的 `totalResponses` 与当前数据不一致时自动失效（说明有新回答提交）
- **自动触发**：首次进入页面且无有效缓存时，自动调用生成
- **手动刷新**：用户可点击「重新生成」强制刷新

```ts
function loadCached(surveyId: string): CachedSummary | null {
  const raw = localStorage.getItem(getStorageKey(surveyId))
  if (!raw) return null
  const parsed = JSON.parse(raw)
  if (parsed.surveyId !== surveyId) return null
  return parsed
}

// 使用时校验 totalResponses
const cached = loadCached(id)
if (cached && cached.totalResponses === data.totalResponses) {
  setContent(cached.content)
}
```

### 4. Zod Schema 校验

`lib/ai/schema.ts` 使用 **Discriminated Union** 根据 `type` 字段区分不同题型的 `config` 结构：

```ts
export const aiQuestionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("SINGLE_CHOICE"),
    title: z.string().min(1),
    config: singleChoiceConfigSchema, // { options: [...], columns?: number }
  }),
  z.object({
    type: z.literal("RATING"),
    title: z.string().min(1),
    config: ratingConfigSchema,       // { min, max, minLabel?, maxLabel? }
  }),
  // ... 其他题型
])
```

校验边界：
- 单选/多选/下拉：最少 2 个选项，最多 10 个
- 排序题：最少 2 个，最多 8 个
- 矩阵题：行 2-8，列 2-6
- 题目总数：最少 1 道，最多 20 道

### 5. 当前状态说明

- **AI 总结页面**（`summary/page.tsx`）功能完整，支持缓存、流式渲染、Markdown 展示、复制报告。
- **Sidebar 入口已隐藏**：该页面目前只能通过直接访问 URL（`/surveys/{id}/results/summary`）进入，未在导航菜单中暴露入口。

---

## 依赖

- `ai` — Vercel AI SDK，提供 `generateObject`、`streamObject`、`streamText`
- `@ai-sdk/openai-compatible` — 兼容 OpenAI 格式的 Provider 工厂
- `@ai-sdk/react` — React Hooks（`useObject`）
- `zod` — Schema 定义与校验
- `nanoid` — 为 AI 生成的题目补充前端唯一 ID
