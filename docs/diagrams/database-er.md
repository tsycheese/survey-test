# 数据库 ER 图

## 问卷系统数据库实体关系图

```mermaid
erDiagram
    USER {
        string id PK "@id @default(cuid)"
        string name "可选"
        string email UK "唯一"
        datetime emailVerified "可选"
        string image "可选"
        string password "可选（OAuth 用户为空）"
        datetime createdAt "@default(now)"
        datetime updatedAt "@updatedAt"
    }

    ACCOUNT {
        string id PK "@id @default(cuid)"
        string userId FK "-> User.id"
        string type "oauth / credentials"
        string provider "google / github"
        string providerAccountId
        string refresh_token "@db.Text 可选"
        string access_token "@db.Text 可选"
        int expires_at "可选"
        string token_type "可选"
        string scope "可选"
        string id_token "@db.Text 可选"
        string session_state "可选"
    }

    SESSION {
        string id PK "@id @default(cuid)"
        string sessionToken UK "唯一"
        string userId FK "-> User.id"
        datetime expires
    }

    VERIFICATION_TOKEN {
        string identifier
        string token UK "唯一"
        datetime expires
    }

    AUTHENTICATOR {
        string credentialID UK "唯一"
        string userId FK "-> User.id"
        string providerAccountId
        string credentialPublicKey
        int counter
        string credentialDeviceType
        boolean credentialBackedUp
        string transports "可选"
    }

    SURVEY {
        string id PK "@id @default(cuid)"
        string title
        string description "可选"
        boolean published "@default(false)"
        string shareToken UK "唯一 @default(cuid)"
        json settings "可选"
        string userId FK "-> User.id (所有者)"
        int maxCollaborators "@default(10)"
        string currentVersionId "可选，指向当前发布版本"
        datetime createdAt "@default(now)"
        datetime updatedAt "@updatedAt"
    }

    QUESTION {
        string id PK "@id @default(cuid)"
        string surveyId FK "-> Survey.id"
        string title
        string description "可选"
        enum type "QuestionType: 18种题型"
        int order "排序"
        boolean required "@default(false)"
        json config "题型配置"
        string lockedBy "可选，正在编辑的用户ID"
        datetime lockedAt "可选"
    }

    SURVEY_VERSION {
        string id PK "@id @default(cuid)"
        string surveyId FK "-> Survey.id"
        int version "版本号 v1, v2..."
        string title
        string description "可选"
        json questions "完整题目数据快照"
        datetime publishedAt "@default(now)"
        datetime createdAt "@default(now)"
    }

    RESPONSE {
        string id PK "@id @default(cuid)"
        string surveyId FK "-> Survey.id"
        string versionId FK "-> SurveyVersion.id"
        string respondent "可选，答题者标识"
        datetime startedAt "可选"
        datetime completedAt "可选"
        datetime createdAt "@default(now)"
        string deviceType "desktop / mobile / tablet"
        string os "Windows / macOS / iOS / Android / Linux"
        string browser "Chrome / Safari / Firefox / Edge"
        string source "渠道来源"
        string referrer "HTTP Referer"
        string ip "IP 地址"
        string country
        string province
        string city
    }

    ANSWER {
        string id PK "@id @default(cuid)"
        string responseId FK "-> Response.id"
        string questionId FK "-> Question.id"
        json value "回答内容"
    }

    SURVEY_COLLABORATOR {
        string id PK "@id @default(cuid)"
        string surveyId FK "-> Survey.id"
        string userId FK "-> User.id"
        boolean canEdit "@default(false)"
        boolean canViewResults "@default(false)"
        string invitedBy "邀请人ID"
        datetime createdAt "@default(now)"
    }

    SURVEY_INVITE {
        string id PK "@id @default(cuid)"
        string surveyId FK "-> Survey.id"
        string code UK "唯一"
        int maxUses "可选，最大使用次数"
        int usedCount "@default(0)"
        datetime expiresAt "可选"
        json permissions "权限配置"
        string createdBy "创建人ID"
        datetime createdAt "@default(now)"
    }

    SURVEY_LOG {
        string id PK "@id @default(cuid)"
        string surveyId FK "-> Survey.id"
        string userId FK "-> User.id"
        string action "操作类型"
        json details "可选，操作详情"
        datetime createdAt "@default(now)"
    }

    SURVEY_VIEW {
        string id PK "@id @default(cuid)"
        string surveyId FK "-> Survey.id"
        datetime viewedAt "@default(now)"
        string ip "可选"
        string deviceType "可选"
        string os "可选"
        string browser "可选"
        string country "可选"
        string province "可选"
        string city "可选"
    }

    %% 认证模块关系
    USER ||--o{ ACCOUNT : "拥有"
    USER ||--o{ SESSION : "拥有"
    USER ||--o{ AUTHENTICATOR : "拥有"

    %% 问卷核心关系
    USER ||--o{ SURVEY : "创建"
    SURVEY ||--o{ QUESTION : "包含"
    SURVEY ||--o{ SURVEY_VERSION : "发布版本"
    SURVEY ||--o{ RESPONSE : "收到回答"
    SURVEY ||--o{ SURVEY_VIEW : "被浏览"
    SURVEY ||--o{ SURVEY_COLLABORATOR : "协作者"
    SURVEY ||--o{ SURVEY_INVITE : "邀请码"
    SURVEY ||--o{ SURVEY_LOG : "操作日志"

    %% 版本与回答
    SURVEY_VERSION ||--o{ RESPONSE : "关联回答"

    %% 回答与答案
    RESPONSE ||--o{ ANSWER : "包含"
    QUESTION ||--o{ ANSWER : "被回答"

    %% 协作关系
    USER ||--o{ SURVEY_COLLABORATOR : "参与协作"
    SURVEY_COLLABORATOR }o--|| SURVEY : "属于"
    SURVEY_COLLABORATOR }o--|| USER : "用户"

    %% 日志关系
    USER ||--o{ SURVEY_LOG : "产生日志"
```

## 关系说明

| 关系 | 类型 | 描述 |
|------|------|------|
| User → Account | 1:N | 一个用户可绑定多个 OAuth 账号 |
| User → Session | 1:N | 一个用户可有多个活跃会话 |
| User → Survey | 1:N | 一个用户可创建多个问卷 |
| User → SurveyCollaborator | 1:N | 一个用户可协作多个问卷 |
| User → SurveyLog | 1:N | 一个用户可产生多条操作日志 |
| User → Authenticator | 1:N | 一个用户可有多台认证设备 |
| Survey → Question | 1:N | 一个问卷包含多个题目 |
| Survey → SurveyVersion | 1:N | 一个问卷有多个历史版本 |
| Survey → Response | 1:N | 一个问卷收到多条回答 |
| Survey → SurveyView | 1:N | 一个问卷有多条浏览记录 |
| Survey → SurveyCollaborator | 1:N | 一个问卷有多个协作者 |
| Survey → SurveyInvite | 1:N | 一个问卷可生成多个邀请码 |
| Survey → SurveyLog | 1:N | 一个问卷有多条操作日志 |
| SurveyVersion → Response | 1:N | 一个版本关联多条回答 |
| Response → Answer | 1:N | 一条回答包含多个题目的答案 |
| Question → Answer | 1:N | 一个题目可被多次回答 |
| SurveyCollaborator | N:M 关联表 | Survey + User 的多对多关系，附带权限字段 |

## 索引说明

| 表 | 索引字段 | 用途 |
|----|----------|------|
| Survey | currentVersionId | 快速查询当前发布版本 |
| Question | lockedBy | 查询被锁定的题目 |
| Response | versionId, createdAt | 按版本和创建时间筛选 |
| SurveyCollaborator | surveyId, userId | 快速查询协作者 |
| SurveyInvite | surveyId, code | 按问卷和邀请码查询 |
| SurveyLog | surveyId, createdAt | 按问卷和时间查询日志 |
| SurveyVersion | surveyId, publishedAt | 按问卷和发布时间查询 |
| SurveyView | surveyId, viewedAt | 按问卷和浏览时间统计 |

## QuestionType 枚举

```
SINGLE_CHOICE, MULTIPLE_CHOICE, TEXT, RATING, DROPDOWN,
TEXTAREA, NUMBER, NPS, CES, PHONE, EMAIL, DATETIME,
RANKING, MATRIX_SINGLE, NAME, GENDER, BIRTHDAY,
IMAGE_SINGLE_CHOICE, IMAGE_MULTIPLE_CHOICE
```
