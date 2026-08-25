# 问卷协作 E2E 测试

这组 Playwright 测试使用两个完全隔离的浏览器会话，分别模拟问卷所有者和可编辑协作者。账号、问卷和题目会在每个用例开始前写入本地 PostgreSQL，并在用例结束后自动清理。

## 首次准备

1. 确保本地 PostgreSQL 已启动并包含当前 Prisma 结构。
2. 确保 Docker Desktop 已启动；测试命令会自动启动本地 Soketi。
3. 安装 Chromium：

   ```powershell
   pnpm exec playwright install chromium
   ```

4. 如需使用独立测试数据库，将 `.env.e2e.example` 复制为 `.env.e2e.local`，并填写 `E2E_DATABASE_URL`。

测试配置会拒绝连接非 `localhost`、`127.0.0.1` 或 `::1` 的数据库，避免误删远程数据。独立测试数据库也必须先执行一次 Prisma schema push；执行时请让 `DATABASE_URL` 指向该数据库。

## 执行

运行完整测试：

```powershell
pnpm test:e2e
```

使用 Playwright 交互界面调试：

```powershell
pnpm test:e2e:ui
```

E2E 使用 `http://127.0.0.1:3310` 和独立的 `.next-e2e` 构建目录，不会占用日常开发的 3000 端口或 `.next` 缓存。

## 当前覆盖范围

- 首次进入编辑页不自动选中、也不锁定第一题。
- 协作者锁定题目、切换题目以及离开页面时，两端 UI 与数据库锁状态一致。
- 连续添加三道题后，两端题目数量一致，临时题目全部转正。
- 数据库中的题目 ID 和 `clientMutationId` 保持唯一，排序连续且无重复。

测试使用固定邮箱 `playwright.owner@example.test` 和 `playwright.collaborator@example.test`。这些账号仅在本地测试期间存在。
