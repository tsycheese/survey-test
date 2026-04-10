# 问卷协作邀请功能实现计划

## 需求总结

### 权限模型
- **自定义细粒度权限**：编辑题目、查看结果
- **仅创建者可**：删除问卷、发布/取消发布、管理邀请

### 邀请机制
- **邀请码方式**：用户登录后输入邀请码加入
- **可配置有效期**：1天 / 7天 / 30天 / 永久
- **使用次数**：不限制（有效期内可无限使用）
- **协作者上限**：默认10人，可配置

### 操作日志
- 仅记录关键操作：题目增删改、问卷发布/取消发布

### 实时同步
- 待后续讨论具体方案

---

## 数据库变更

### 新增模型

```prisma
// 协作者关系表
model SurveyCollaborator {
  id        String   @id @default(cuid())
  surveyId  String
  userId    String
  canEdit   Boolean  @default(false)  // 编辑题目权限
  canViewResults Boolean @default(false)  // 查看结果权限
  invitedBy String   // 邀请人ID
  createdAt DateTime @default(now())

  survey Survey @relation(fields: [surveyId], references: [id], onDelete: Cascade)
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([surveyId, userId])
  @@index([surveyId])
  @@index([userId])
}

// 邀请码表
model SurveyInvite {
  id         String    @id @default(cuid())
  surveyId   String
  code       String    @unique  // 6位字母数字组合
  maxUses    Int?      // 最大使用次数（null表示无限）
  usedCount  Int       @default(0)
  expiresAt  DateTime? // 过期时间（null表示永久）
  permissions Json?    // { canEdit: boolean, canViewResults: boolean }
  createdBy  String
  createdAt  DateTime  @default(now())

  survey Survey @relation(fields: [surveyId], references: [id], onDelete: Cascade)

  @@index([surveyId])
  @@index([code])
}

// 操作日志表
model SurveyLog {
  id        String   @id @default(cuid())
  surveyId  String
  userId    String
  action    String   // CREATE_QUESTION, UPDATE_QUESTION, DELETE_QUESTION, PUBLISH, UNPUBLISH
  details   Json?    // 操作详情
  createdAt DateTime @default(now())

  survey Survey @relation(fields: [surveyId], references: [id], onDelete: Cascade)
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([surveyId])
  @@index([createdAt])
}
```

### Survey 模型扩展
```prisma
model Survey {
  // ... 现有字段
  maxCollaborators Int @default(10)  // 协作者上限
  
  collaborators SurveyCollaborator[]
  invites       SurveyInvite[]
  logs          SurveyLog[]
}
```

---

## 分阶段实现计划

### 阶段一：数据库与基础 API（预计 2-3 小时）

**目标**：建立数据模型和核心接口

1. **数据库迁移**
   - 创建 `SurveyCollaborator` 表
   - 创建 `SurveyInvite` 表
   - 创建 `SurveyLog` 表
   - Survey 表添加 `maxCollaborators` 字段

2. **API 开发**
   - `GET /api/surveys/[id]/collaborators` - 获取协作者列表
   - `POST /api/surveys/[id]/invites` - 创建邀请码
   - `GET /api/surveys/[id]/invites` - 获取邀请码列表
   - `DELETE /api/surveys/[id]/invites/[inviteId]` - 删除邀请码
   - `POST /api/invites/join` - 使用邀请码加入
   - `PUT /api/surveys/[id]/collaborators/[userId]` - 修改协作者权限
   - `DELETE /api/surveys/[id]/collaborators/[userId]` - 移除协作者
   - `GET /api/surveys/[id]/logs` - 获取操作日志

3. **权限中间件**
   - 扩展 `lib/auth.ts` 添加协作者权限检查
   - 创建 `requireCollaboratorPermission` 辅助函数

---

### 阶段二：邀请管理 UI（预计 2-3 小时）

**目标**：创建者可管理邀请和协作者

1. **问卷设置面板扩展**
   - 添加"协作设置"区域
   - 协作者上限设置
   - 邀请码管理（生成、查看、删除）
   - 协作者列表（查看、修改权限、移除）

2. **邀请码生成弹窗**
   - 选择有效期（1天/7天/30天/永久）
   - 设置权限（编辑/查看结果）
   - 生成后显示邀请码和复制按钮

3. **协作者管理组件**
   - 列表展示协作者信息
   - 权限开关（编辑、查看结果）
   - 移除按钮

---

### 阶段三：接受邀请流程（预计 1-2 小时）

**目标**：用户可使用邀请码加入问卷

1. **邀请码输入页面**
   - 创建 `/invite` 页面
   - 输入框 + 提交按钮
   - 验证邀请码有效性
   - 显示问卷信息确认

2. **加入确认流程**
   - 显示问卷标题、创建者
   - 显示获得的权限
   - 确认加入按钮

3. **导航入口**
   - 在首页或问卷列表添加"加入协作"入口

---

### 阶段四：权限控制集成（预计 2-3 小时）

**目标**：将权限控制应用到现有功能

1. **编辑器权限控制**
   - 无编辑权限时：编辑器只读模式
   - 有编辑权限时：正常编辑
   - 显示当前用户权限状态

2. **结果页权限控制**
   - 无查看结果权限：隐藏统计入口或显示无权限提示
   - 有权限：正常查看

3. **API 权限加固**
   - 所有修改类 API 检查协作者权限
   - 发布/删除操作仅创建者可执行

4. **问卷列表调整**
   - 协作者的问卷也显示在"我的问卷"列表
   - 标记为"协作中"状态

---

### 阶段五：操作日志（预计 1-2 小时）

**目标**：记录关键操作

1. **日志记录**
   - 在题目增删改 API 中记录日志
   - 在发布/取消发布 API 中记录日志

2. **日志查看页面**
   - 在问卷设置中添加"操作日志"标签页
   - 列表展示操作记录
   - 显示操作人、操作类型、时间

---

### 阶段六：实时同步方案讨论（待定）

待后续讨论确定方案：
- WebSocket 实时协作
- 乐观锁/版本控制
- 其他方案

---

## 接口设计

### 创建邀请码
```typescript
POST /api/surveys/[id]/invites
{
  "expiresIn": "7d", // "1d" | "7d" | "30d" | null(永久)
  "permissions": {
    "canEdit": true,
    "canViewResults": false
  }
}

Response: {
  "id": string,
  "code": "ABC123",
  "expiresAt": "2026-04-17T...",
  "permissions": {...}
}
```

### 使用邀请码加入
```typescript
POST /api/invites/join
{
  "code": "ABC123"
}

Response: {
  "survey": {
    "id": string,
    "title": string
  },
  "permissions": {
    "canEdit": true,
    "canViewResults": false
  }
}
```

---

## 注意事项

1. **安全性**
   - 邀请码使用 6 位字母数字组合（避免混淆字符如 0/O, 1/I/l）
   - API 严格校验权限，前端仅做展示控制

2. **用户体验**
   - 邀请码支持一键复制
   - 过期邀请码自动清理或标记
   - 协作者上限达到时给出友好提示

3. **数据一致性**
   - 删除问卷时级联删除所有协作相关数据
   - 删除用户时处理协作者关系

---

## 预估总工时

- 阶段一：2-3 小时
- 阶段二：2-3 小时
- 阶段三：1-2 小时
- 阶段四：2-3 小时
- 阶段五：1-2 小时

**总计：8-13 小时**（不含实时同步）
