# 开发踩坑记录

> 记录系统开发过程中遇到的关键技术问题及解决方案，供论文「实现难点」章节参考。

---

## 1. 行内编辑高度跳变问题

**来源**：`docs/dev-note-inline-editing-height-jump.md`

### 现象
问卷编辑器中，题目标题从「预览态」（`div`）切换到「编辑态」（`textarea`）时，父容器高度从 36px 跳变为 42.5px，产生闪烁感。

### 根因
`textarea` 默认是 `inline-block` 元素，浏览器会为文字的「降部」（descender）预留基线对齐空间，导致父容器被撑开。

### 解决方案
将 `textarea` 显式设置为 `display: block`，彻底脱离行内布局的基线对齐规则。

### 论文价值
可作为「前端交互优化」案例，体现对 CSS 布局模型的深入理解。

---

## 2. 问卷列表快速发布导致外键错误

**来源**：`docs/问卷发布与版本管理.md`

### 现象
问卷列表页的「快速发布」按钮直接切换 `published` 状态，但未创建 `SurveyVersion` 记录。用户提交答案时，`versionId` 为空，触发数据库外键约束错误：
```
Response_versionId_fkey violation
```

### 根因
发布流程存在两个入口（列表页快速发布 vs 编辑器版本管理），前者缺少版本创建步骤。

### 解决方案
- **短期**：隐藏列表页发布按钮，强制通过编辑器「版本管理」弹窗发布
- **长期**：统一发布入口，或让 `publish` API 自动创建首个版本

### 论文价值
可作为「数据一致性设计」案例，体现版本管理与发布状态的耦合设计思考。

---

## 3. GENDER 题型计数逻辑不一致

**来源**：`docs/题型系统模块.md`、`docs/结果统计与可视化模块.md`

### 现象
统计图表中 GENDER 题型的选项计数始终为 0，而其他选择题正常。

### 根因
- 大多数选择题存储的是**选项标签**（label）到 `Answer.value`
- GENDER 题型特殊：存储的是**选项 ID**（`male`/`female`/`other`）到 `Answer.value`
- 统计代码统一使用 `opt.label` 匹配，导致 GENDER 无法命中

### 解决方案
在统计图表组件中增加类型判断：
```tsx
const matchKey = type === "GENDER" ? "id" : "label"
const count = counts[opt[matchKey]] || 0
```

### 论文价值
可作为「数据存储一致性」案例，体现特殊题型的差异化处理。

---

## 4. MATRIX_SINGLE 提交数据格式问题

**来源**：`docs/问卷填写与提交模块.md`

### 现象
矩阵单选题提交后服务器返回 400 错误，提示答案格式不正确。

### 根因
矩阵单选题的答案格式是对象（`{ rowId: colId }`），而提交 API 的 zod schema 最初只接受 `string | string[] | number | null`，缺少 `record` 类型。

### 解决方案
扩展 zod schema：
```ts
z.record(z.string(), z.union([
  z.string(), z.array(z.string()), z.number(), z.null(),
  z.record(z.string(), z.string()), // MATRIX_SINGLE
]))
```

### 论文价值
可作为「数据校验设计」案例，体现动态题型对 schema 灵活性的要求。

---

## 5. AI 总结可用性问题

**来源**：`docs/AI辅助模块.md`

### 现象
AI 总结功能开发完成后，实际使用中发现：
- 问卷数据量较小时，AI 生成的总结内容空洞、模板化
- 流式输出等待时间较长，用户体验不佳
- 总结质量与问卷设计质量强相关，难以保证稳定性

### 解决方案
- 保留页面和 API 代码
- 暂时从 sidebar 隐藏入口，避免用户误用
- 后续优化方向：增加数据预处理、改进 prompt、支持用户自定义分析维度

### 论文价值
可作为「AI 功能迭代」案例，体现对 AI 输出质量的用户体验考量。

---

## 6. 地理位置 HTTPS 混合内容问题

**来源**：`docs/geo-location.md`

### 现象
生产环境（HTTPS）下地理位置功能失效，浏览器控制台报错：
```
Mixed Content: The page at 'https://...' was loaded over HTTPS,
but requested an insecure XMLHttpRequest endpoint 'http://ip-api.com/...'.
```

### 根因
ip-api.com 免费版仅支持 HTTP，而现代浏览器的安全策略禁止 HTTPS 页面发起 HTTP 请求。

### 解决方案（三选一）
1. **服务器代理**（推荐）：前端请求同域 `/api/geoip`，服务端转发到 ip-api.com
2. **切换服务商**：使用支持 HTTPS 的 ipapi.co（有免费额度限制）
3. **本地数据库**：使用 MaxMind GeoLite2 本地库，无需网络请求

### 论文价值
可作为「生产环境部署」案例，体现对浏览器安全策略的理解。

---

## 7. Next.js 15 params 为 Promise

**来源**：开发过程

### 现象
升级到 Next.js 15 后，所有动态路由页面报错：
```
Error: Route parameter was not awaited
```

### 根因
Next.js 15 将 `params` 和 `searchParams` 改为异步 Promise，必须 `await` 后才能解构。

### 解决方案
所有动态路由页面统一修改：
```tsx
// 旧写法（Next.js 14）
export default function Page({ params }: { params: { id: string } }) {
  const { id } = params
}

// 新写法（Next.js 15）
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
}
```

### 论文价值
可作为「框架升级适配」案例，体现对 Next.js 演进路线的跟踪。

---

## 总结

| 问题 | 类型 | 论文章节 | 难度 |
|------|------|---------|------|
| 行内编辑高度跳变 | CSS 布局 | 4.2 编辑器实现 | ⭐⭐ |
| 快速发布外键错误 | 数据一致性 | 4.3 版本管理 | ⭐⭐⭐ |
| GENDER 计数逻辑 | 数据存储 | 4.5 统计图表 | ⭐⭐ |
| MATRIX_SINGLE 提交 | 数据校验 | 4.4 提交模块 | ⭐⭐ |
| AI 总结可用性 | 用户体验 | 4.6 AI 模块 | ⭐⭐⭐ |
| HTTPS 混合内容 | 部署安全 | 4.4/5.1 | ⭐⭐⭐ |
| Next.js 15 params | 框架升级 | 4.1 环境搭建 | ⭐⭐ |
