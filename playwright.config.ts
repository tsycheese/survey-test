import { defineConfig, devices } from "@playwright/test"
import { config as loadEnv } from "dotenv"

loadEnv({ path: ".env" })
loadEnv({ path: ".env.e2e.local", override: true })

// 显式覆盖优先，用于本地 E2E 凭据过期时安全地切换到另一套本地数据库。
const databaseUrl =
  process.env.E2E_DATABASE_URL_OVERRIDE ||
  process.env.E2E_DATABASE_URL ||
  process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error(
    "Playwright 需要 E2E_DATABASE_URL，或指向本地 PostgreSQL 的 DATABASE_URL"
  )
}

const databaseHost = new URL(databaseUrl).hostname
if (!["127.0.0.1", "localhost", "::1"].includes(databaseHost)) {
  throw new Error("拒绝在非本地数据库上运行 E2E。请配置本地 E2E_DATABASE_URL。")
}

process.env.DATABASE_URL = databaseUrl
process.env.REALTIME_PROVIDER ||= "soketi"
process.env.NEXT_PUBLIC_REALTIME_PROVIDER ||= "soketi"

const baseURL = process.env.E2E_BASE_URL || "http://127.0.0.1:3310"

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  // 双账号首轮会并发触发编辑页与协作接口的 Turbopack 冷编译。
  timeout: 45_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    viewport: { width: 1440, height: 1000 },
  },
  webServer: {
    command:
      "node ./node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port 3310",
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
      NEXT_DIST_DIR: ".next-e2e",
      NEXT_PUBLIC_ENABLE_PERF_LOGS: "true",
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], channel: "chromium" },
    },
  ],
})
