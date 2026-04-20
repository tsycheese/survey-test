# 论文截图清单

> 以下截图需要手动截取并放入本目录，然后在 LaTeX 中替换占位符。

---

## 一、附录 B：系统界面截图（5 张）

### 1. `screenshot-login.png` — 登录页面
- **位置**：附录 B
- **获取方式**：访问 `/login`，截取完整页面
- **要求**：展示登录表单 + OAuth 按钮

### 2. `screenshot-survey-list.png` — 问卷列表页面
- **位置**：附录 B
- **获取方式**：登录后访问 `/surveys`，截取完整页面
- **要求**：展示多个问卷卡片，包含题目数/回答数/状态

### 3. `screenshot-editor.png` — 问卷编辑器
- **位置**：附录 B、第4章 4.1 节
- **获取方式**：进入某个问卷的编辑页面 `/surveys/{id}/edit`
- **要求**：展示三栏布局（题型面板/画布/设置面板），至少包含 2-3 道题目

### 4. `screenshot-public-form.png` — 公开问卷填写页面
- **位置**：附录 B
- **获取方式**：发布问卷后，用分享链接 `/s/{token}` 访问
- **要求**：展示完整的问卷填写界面，包含多种题型

### 5. `screenshot-results.png` — 结果统计页面
- **位置**：附录 B
- **获取方式**：进入某个有数据的问卷结果页 `/surveys/{id}/results`
- **要求**：展示数据概览标签，包含 KPI 卡片和图表

---

## 二、第3章：系统分析与设计（2 张）

### 6. `diagram-architecture.png` — 系统架构图
- **位置**：第3章 3.2 节
- **获取方式**：使用 Mermaid Live Editor (https://mermaid.live) 渲染 `docs/diagrams/system-architecture.md` 中的图表
- **要求**：清晰展示四层架构和主要组件

### 7. `diagram-er.png` — 数据库 E-R 图
- **位置**：第3章 3.3 节
- **获取方式**：使用 Mermaid Live Editor 渲染 `docs/diagrams/database-er.md` 中的图表
- **要求**：展示所有实体和关系

---

## 三、第4章：详细设计与实现（2 张）

### 8. `screenshot-collaboration.png` — 实时协作界面
- **位置**：第4章 4.7 节
- **获取方式**：两个浏览器同时打开同一问卷编辑器
- **要求**：展示在线成员列表 + 题目锁定状态

---

## 四、可选补充截图（建议补充）

### 9. `screenshot-charts.png` — 统计图表页面
- **位置**：可插入第4章 4.4 节
- **获取方式**：结果页切换到「统计图表」标签
- **要求**：展示逐题统计图表

### 10. `screenshot-ai-generate.png` — AI 生成问卷弹窗
- **位置**：可插入第4章 4.5 节
- **获取方式**：编辑器中点击 AI 生成按钮
- **要求**：展示需求澄清对话框或生成结果

### 11. `screenshot-version-dialog.png` — 版本管理弹窗
- **位置**：可插入第4章 4.2 节
- **获取方式**：编辑器中点击版本管理
- **要求**：展示版本列表和发布按钮

### 12. `screenshot-cross-analysis.png` — 交叉分析页面
- **位置**：可插入第4章 4.4 节
- **获取方式**：结果页切换到「交叉分析」标签
- **要求**：展示两题交叉透视表

---

## 截图规范

| 项目 | 建议 |
|------|------|
| 分辨率 | 1920×1080 或更高 |
| 浏览器 | Chrome，窗口最大化 |
| 格式 | PNG（推荐）或 JPG |
| 命名 | 使用上述英文文件名 |
| 存放 | `thesis/figures/` 目录 |

## LaTeX 引用方式

截图放入 `figures/` 后，将占位符替换为：

```latex
\begin{figure}[H]
\centering
\includegraphics[width=0.9\textwidth]{figures/screenshot-editor.png}
\caption{问卷编辑器界面}
\label{fig:editor}
\end{figure}
```
