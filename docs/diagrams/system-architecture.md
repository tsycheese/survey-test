# 系统架构图

## Next.js 问卷系统架构

```mermaid
flowchart TB
    subgraph Client["客户端层 (Browser)"]
        Browser["浏览器"]
        subgraph Pages["页面路由 (App Router)"]
            Landing["/ 首页 (Landing)"]
            AuthPages["(auth)/login /register<br/>登录/注册页"]
            DashboardPages["(dashboard)/surveys<br/>问卷列表 / 新建 / 共享"]
            EditorPages["(editor)/surveys/[id]/edit<br/>问卷编辑器"]
            PreviewPages["(editor)/surveys/[id]/preview<br/>预览页"]
            ResultsPages["(editor)/surveys/[id]/results<br/>结果分析 / 图表 / 交叉 / 明细"]
            SurveyPublic["s/[token]<br/>公开问卷答题页"]
            InvitePages["invite/[surveyId]/[code]<br/>邀请加入页"]
        end
        subgraph UIComponents["UI 组件层"]
            AuthUI["auth: LoginForm / RegisterForm"]
            EditorUI["editor: EditorHeader / SidebarPalette<br/>SurveySettingsPanel / VersionDialog"]
            QuestionUI["questions: 16+ 题型组件"]
            ResultsUI["results: Charts / KPI / Trend / LocationStats"]
            CollabUI["collaboration: OnlineMembers / LockIndicator"]
            AIUI["ai: AIChatDialog / AIClarifyDialog"]
        end
    end

    subgraph NextServer["Next.js App Router 服务端"]
        subgraph ServerComponents["Server Components"]
            SC_Landing["page.tsx (Landing)"]
            SC_Dashboard["page.tsx (Dashboard)"]
            SC_Editor["page.tsx (Editor)"]
            SC_Results["page.tsx (Results)"]
            SC_Survey["page.tsx (Public Survey)"]
        end

        subgraph ServerActions["Server Actions"]
            SA_Auth["auth: signIn / signOut / register"]
            SA_Survey["survey: create / update / delete / publish"]
            SA_Question["question: add / edit / reorder / remove"]
            SA_Response["response: submitAnswer / complete"]
            SA_Collab["collaboration: join / leave / lock / unlock"]
            SA_AI["ai: generate / clarify / summarize"]
        end

        subgraph APIRoutes["API Routes (Route Handlers)"]
            API_Auth["/api/auth/[...nextauth]<br/>NextAuth.js OAuth + Credentials"]
            API_AI["/api/ai/*<br/>chat / clarify / generate / generate-stream / summarize"]
            API_Surveys["/api/surveys/*<br/>CRUD / collaborators / invites / versions / publish / logs"]
            API_Questions["/api/surveys/[id]/questions/*<br/>CRUD / reorder"]
            API_Responses["/api/responses/[id]<br/>获取回答详情"]
            API_PublicS["/api/s/[token] / submit / view<br/>公开问卷接口"]
            API_Upload["/api/upload/sign / image<br/>Cloudinary 签名/删除"]
            API_User["/api/user/profile / avatar / password"]
            API_Pusher["/api/pusher/auth<br/>Presence Channel 认证"]
            API_Invites["/api/invites/join / validate"]
            API_Collab["/api/surveys/collaboration/*<br/>join / leave / lock / unlock / unlock-all"]
        end

        subgraph LibLayer["lib 工具层"]
            LibAuth["auth.ts<br/>NextAuth + PrismaAdapter + bcryptjs"]
            LibPrisma["prisma.ts<br/>Prisma Client (PostgreSQL)"]
            LibPusher["pusher.ts<br/>Pusher Server + 事件定义"]
            LibAI["ai/*<br/>deepseek-provider / prompt / schema"]
            LibCloudinary["cloudinary.ts<br/>上传/删除/URL 生成"]
            LibGeoIP["geoip.ts<br/>ip-api 地域解析"]
            LibUA["ua-parser.ts<br/>设备/浏览器解析"]
            LibStore["editor-store.ts<br/>Zustand 编辑器状态"]
            LibCollab["collaboration.ts<br/>协作逻辑"]
            LibUtils["utils.ts / validations/*"]
        end
    end

    subgraph External["外部服务层"]
        DB[("PostgreSQL<br/>Prisma ORM")]
        PusherService["Pusher<br/>实时协作通道"]
        DeepSeek["DeepSeek API<br/>AI 生成/总结/澄清"]
        CloudinaryService["Cloudinary<br/>图片存储与转换"]
        IPAPI["ip-api.com<br/>IP 地域解析"]
        OAuth["OAuth 2.0<br/>Google / GitHub"]
    end

    %% 客户端到服务端
    Browser --> Pages
    Pages --> UIComponents
    UIComponents --> ServerComponents
    UIComponents --> ServerActions
    UIComponents --> APIRoutes

    %% Server Components 到 Lib
    ServerComponents --> LibPrisma
    ServerComponents --> LibAuth

    %% Server Actions 到 Lib
    ServerActions --> LibPrisma
    ServerActions --> LibAuth
    ServerActions --> LibPusher
    ServerActions --> LibAI
    ServerActions --> LibCloudinary
    ServerActions --> LibGeoIP

    %% API Routes 到 Lib
    APIRoutes --> LibLayer

    %% Lib 到外部服务
    LibPrisma --> DB
    LibAuth --> OAuth
    LibPusher --> PusherService
    LibAI --> DeepSeek
    LibCloudinary --> CloudinaryService
    LibGeoIP --> IPAPI

    %% 数据流标注
    Browser -.->|"1. 访问公开问卷"| SurveyPublic
    SurveyPublic -.->|"2. 获取问卷数据"| API_PublicS
    API_PublicS -.->|"3. Prisma 查询"| DB
    DB -.->|"4. 返回问卷"| API_PublicS
    API_PublicS -.->|"5. 渲染问卷"| SurveyPublic
    Browser -.->|"6. 提交回答"| API_PublicS
    API_PublicS -.->|"7. 解析 IP/UA"| LibGeoIP
    LibGeoIP -.->|"8. 写入回答+地域"| DB

    Browser -.->|"A. 编辑器操作"| EditorPages
    EditorPages -.->|"B. 调用 Server Action"| SA_Collab
    SA_Collab -.->|"C. Pusher 广播"| LibPusher
    LibPusher -.->|"D. 实时同步"| Browser

    Browser -.->|"E. AI 辅助"| AIUI
    AIUI -.->|"F. /api/ai/generate"| API_AI
    API_AI -.->|"G. DeepSeek API"| DeepSeek
    DeepSeek -.->|"H. 返回生成结果"| API_AI

    Browser -.->|"I. 上传图片"| API_Upload
    API_Upload -.->|"J. 签名+上传"| CloudinaryService
    CloudinaryService -.->|"K. 返回 URL"| Browser

    style Client fill:#e1f5fe
    style NextServer fill:#fff3e0
    style External fill:#e8f5e9
    style APIRoutes fill:#fce4ec
    style ServerActions fill:#f3e5f5
    style ServerComponents fill:#e0f2f1
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
| `(auth)` | `/login`, `/register` | 认证相关页面（无侧边栏布局） |
| `(dashboard)` | `/surveys`, `/surveys/new`, `/surveys/shared`, `/settings` | 用户后台管理 |
| `(editor)` | `/surveys/[id]/edit`, `/surveys/[id]/preview`, `/surveys/[id]/results/*` | 问卷编辑与结果分析 |
| `s/` | `/s/[token]` | 公开问卷答题入口 |
| `invite/` | `/invite/[surveyId]/[code]` | 邀请链接处理 |
| `api/` | `/api/*` | RESTful API 与 NextAuth 端点 |
