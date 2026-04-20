# 系统架构图

## Next.js 问卷系统架构（简洁版）

```mermaid
flowchart LR
    subgraph Client["客户端层"]
        Browser["浏览器<br/>React + Tailwind"]
    end

    subgraph NextJS["Next.js 服务端"]
        SC["Server Components<br/>页面渲染"]
        SA["Server Actions<br/>数据变更"]
        API["API Routes<br/>RESTful 接口"]
        Lib["lib 工具层<br/>Prisma / Auth / Pusher / AI"]
    end

    subgraph External["外部服务层"]
        DB[("PostgreSQL<br/>数据持久化")]
        PusherS["Pusher<br/>实时通信"]
        DeepSeek["DeepSeek API<br/>AI 能力"]
        Cloudinary["Cloudinary<br/>图片存储"]
        OAuth["OAuth 2.0<br/>Google / GitHub"]
    end

    Browser --> SC
    Browser --> SA
    Browser --> API
    SC --> Lib
    SA --> Lib
    API --> Lib
    Lib --> DB
    Lib --> PusherS
    Lib --> DeepSeek
    Lib --> Cloudinary
    Lib --> OAuth

    style Client fill:#e1f5fe
    style NextJS fill:#fff3e0
    style External fill:#e8f5e9
```

## 详细版（横向布局）

```mermaid
flowchart LR
    subgraph Client["客户端层 (Browser)"]
        AuthP["/login /register<br/>认证页"]
        DashP["/surveys<br/>问卷列表"]
        EditP["/surveys/[id]/edit<br/>编辑器"]
        ResultP["/surveys/[id]/results<br/>结果统计"]
        PublicP["/s/[token]<br/>公开问卷"]
        InviteP["/invite<br/>邀请页"]
    end

    subgraph NextServer["Next.js 服务端"]
        SC["Server Components"]
        SA["Server Actions"]
        API["API Routes"]
        Lib["lib 工具层"]
    end

    subgraph External["外部服务"]
        DB[(PostgreSQL)]
        PusherS[Pusher]
        AI[DeepSeek API]
        Cloud[Cloudinary]
        IP[ip-api]
        OAuthS[OAuth]
    end

    AuthP --> SC
    DashP --> SC
    EditP --> SA
    EditP --> API
    ResultP --> API
    PublicP --> API
    InviteP --> API

    SC --> Lib
    SA --> Lib
    API --> Lib

    Lib --> DB
    Lib --> PusherS
    Lib --> AI
    Lib --> Cloud
    Lib --> IP
    Lib --> OAuthS

    style Client fill:#e1f5fe
    style NextServer fill:#fff3e0
    style External fill:#e8f5e9
```

## 架构说明

| 层级 | 职责 | 关键技术 |
|------|------|----------|
| **客户端层** | 页面渲染、用户交互、状态管理 | React 19, Next.js App Router, Zustand, Tailwind CSS, shadcn/ui, ECharts |
| **服务端层** | 服务端渲染、业务逻辑、数据校验 | Next.js Server Components, Server Actions, Route Handlers, Zod |
| **工具层 (lib)** | 数据库访问、外部服务封装、通用逻辑 | Prisma, NextAuth, Pusher, AI SDK, Cloudinary SDK |
| **外部服务层** | 持久化存储、实时通信、AI 能力、文件存储 | PostgreSQL, Pusher, DeepSeek, Cloudinary, ip-api |

## 路由分组说明

| 分组 | 路径模式 | 用途 |
|------|----------|------|
| `(auth)` | `/login`, `/register` | 认证相关页面 |
| `(dashboard)` | `/surveys`, `/surveys/new`, `/settings` | 用户后台管理 |
| `(editor)` | `/surveys/[id]/edit`, `/surveys/[id]/results/*` | 问卷编辑与结果分析 |
| `s/` | `/s/[token]` | 公开问卷答题入口 |
| `invite/` | `/invite/[surveyId]/[code]` | 邀请链接处理 |
| `api/` | `/api/*` | RESTful API 端点 |
