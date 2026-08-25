import { randomUUID } from "node:crypto"
import {
  expect,
  test as base,
  type BrowserContext,
  type Page,
} from "@playwright/test"
import bcrypt from "bcryptjs"
import { prisma } from "../../prisma"

const OWNER_EMAIL = "playwright.owner@example.test"
const COLLABORATOR_EMAIL = "playwright.collaborator@example.test"
const TEST_PASSWORD = "Playwright123!"

export interface CollaborationScenario {
  surveyId: string
  ownerId: string
  collaboratorId: string
  firstQuestionId: string
  secondQuestionId: string
}

interface CollaborationFixtures {
  scenario: CollaborationScenario
  ownerPage: Page
  collaboratorPage: Page
}

async function removeTestUsers() {
  await prisma.user.deleteMany({
    where: {
      email: { in: [OWNER_EMAIL, COLLABORATOR_EMAIL] },
    },
  })
}

async function createScenario(): Promise<CollaborationScenario> {
  await removeTestUsers()

  const password = await bcrypt.hash(TEST_PASSWORD, 10)
  const [owner, collaborator] = await Promise.all([
    prisma.user.create({
      data: {
        name: "E2E 所有者",
        email: OWNER_EMAIL,
        password,
      },
    }),
    prisma.user.create({
      data: {
        name: "E2E 协作者",
        email: COLLABORATOR_EMAIL,
        password,
      },
    }),
  ])

  const survey = await prisma.survey.create({
    data: {
      title: `Playwright 协作测试 ${randomUUID().slice(0, 8)}`,
      description: "由 Playwright 创建并在用例结束后清理",
      userId: owner.id,
      settings: { showQuestionNumber: true },
      collaborators: {
        create: {
          userId: collaborator.id,
          canEdit: true,
          canViewResults: true,
          invitedBy: owner.id,
        },
      },
      questions: {
        create: [
          {
            title: "E2E 第一题",
            type: "TEXT",
            order: 0,
            config: { placeholder: "", format: "any" },
            clientMutationId: randomUUID(),
          },
          {
            title: "E2E 第二题",
            type: "TEXT",
            order: 1,
            config: { placeholder: "", format: "any" },
            clientMutationId: randomUUID(),
          },
        ],
      },
    },
    include: {
      questions: { orderBy: { order: "asc" } },
    },
  })

  return {
    surveyId: survey.id,
    ownerId: owner.id,
    collaboratorId: collaborator.id,
    firstQuestionId: survey.questions[0].id,
    secondQuestionId: survey.questions[1].id,
  }
}

async function login(context: BrowserContext, email: string): Promise<void> {
  const response = await context.request.post("/api/auth/login", {
    data: { email, password: TEST_PASSWORD },
  })

  if (!response.ok()) {
    throw new Error(
      `E2E 登录失败 (${email}): ${response.status()} ${await response.text()}`
    )
  }
}

export const test = base.extend<CollaborationFixtures>({
  scenario: async ({}, provide) => {
    const scenario = await createScenario()
    await provide(scenario)
    await removeTestUsers()
  },

  ownerPage: async ({ browser, baseURL, scenario }, provide) => {
    void scenario
    const context = await browser.newContext({ baseURL })
    await login(context, OWNER_EMAIL)
    const page = await context.newPage()
    await provide(page)
    await context.close()
  },

  collaboratorPage: async ({ browser, baseURL, scenario }, provide) => {
    void scenario
    const context = await browser.newContext({ baseURL })
    await login(context, COLLABORATOR_EMAIL)
    const page = await context.newPage()
    await provide(page)
    await context.close()
  },
})

export { expect, prisma }
