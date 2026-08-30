import type { Page } from "@playwright/test"
import Pusher from "pusher"
import { expect, prisma, test } from "./fixtures/collaboration"
import { COLLABORATION_EVENTS, getSurveyChannel } from "../lib/realtime-shared"

const realtimeTestPublisher = new Pusher({
  appId: process.env.SOKETI_APP_ID ?? "survey-local",
  key: process.env.SOKETI_APP_KEY ?? "survey-local-key",
  secret: process.env.SOKETI_APP_SECRET ?? "survey-local-secret",
  host: process.env.SOKETI_HOST ?? "127.0.0.1",
  port: process.env.SOKETI_PORT ?? "6001",
  useTLS: false,
  timeout: 2000,
})

async function publishQuestionUpdate(
  surveyId: string,
  question: {
    id: string
    type: string
    title: string
    description: string | null
    required: boolean
    order: number
    revision: number
    config: unknown
  }
) {
  await realtimeTestPublisher.trigger(
    getSurveyChannel(surveyId),
    COLLABORATION_EVENTS.QUESTION_UPDATED,
    {
      requestId: crypto.randomUUID(),
      clientId: "playwright-synthetic-remote",
      questionId: question.id,
      question: {
        ...question,
        description: question.description ?? undefined,
        config: question.config as Record<string, unknown>,
      },
      fromUserId: "playwright-synthetic-remote",
      timestamp: new Date().toISOString(),
    }
  )
}

function questionCard(page: Page, questionId: string) {
  return page.locator(`[data-question-id="${questionId}"]`)
}

function trackSurveySnapshotRequests(page: Page, surveyId: string) {
  const snapshotPath = `/api/surveys/${surveyId}`
  let count = 0

  page.on("request", (request) => {
    if (
      request.method() === "GET" &&
      new URL(request.url()).pathname === snapshotPath
    ) {
      count += 1
    }
  })

  return () => count
}

async function questionIdsInDisplayOrder(page: Page) {
  return page
    .locator("[data-question-id]")
    .evaluateAll((questions) =>
      questions.map((question) => question.getAttribute("data-question-id"))
    )
}

async function openEditorPair(
  ownerPage: Page,
  collaboratorPage: Page,
  surveyId: string,
  firstQuestionId: string
) {
  await Promise.all([
    ownerPage.goto(`/surveys/${surveyId}/edit`),
    collaboratorPage.goto(`/surveys/${surveyId}/edit`),
  ])

  await Promise.all([
    expect(questionCard(ownerPage, firstQuestionId)).toBeVisible(),
    expect(questionCard(collaboratorPage, firstQuestionId)).toBeVisible(),
    expect(ownerPage.getByText("2 人在线")).toBeVisible(),
    expect(collaboratorPage.getByText("2 人在线")).toBeVisible(),
  ])
}

test.describe("问卷双账号协作", () => {
  test.afterAll(async () => {
    await prisma.$disconnect()
  })

  test("首次进入编辑页不会自动选中或锁定第一题", async ({
    scenario,
    ownerPage,
    collaboratorPage,
  }) => {
    await openEditorPair(
      ownerPage,
      collaboratorPage,
      scenario.surveyId,
      scenario.firstQuestionId
    )

    await expect(ownerPage.locator('[data-selected="true"]')).toHaveCount(0)
    await expect(
      collaboratorPage.locator('[data-selected="true"]')
    ).toHaveCount(0)

    await expect
      .poll(() =>
        prisma.question.count({
          where: { surveyId: scenario.surveyId, lockedBy: { not: null } },
        })
      )
      .toBe(0)
  })

  test("浏览器时钟偏差不会产生负的实时往返耗时", async ({
    scenario,
    ownerPage,
    collaboratorPage,
  }) => {
    await ownerPage.addInitScript(() => {
      const nativeNow = Date.now
      Date.now = () => nativeNow() - 5_000
    })

    const deliverySamples: Array<{
      eventName?: string
      measurement?: string
      requestToReceived?: string
    }> = []

    ownerPage.on("console", async (message) => {
      if (!message.text().includes("[Realtime Event Delivery Performance]")) {
        return
      }

      const payload = await message
        .args()[1]
        ?.jsonValue()
        .catch(() => null)
      if (payload && typeof payload === "object") {
        deliverySamples.push(payload as (typeof deliverySamples)[number])
      }
    })

    await openEditorPair(
      ownerPage,
      collaboratorPage,
      scenario.surveyId,
      scenario.firstQuestionId
    )

    const ownerFirst = questionCard(ownerPage, scenario.firstQuestionId)
    await ownerFirst.getByText("E2E 第一题", { exact: true }).click()
    await expect(ownerFirst).toHaveAttribute("data-lock-state", "mine")

    await expect
      .poll(
        () =>
          deliverySamples.find(
            (sample) =>
              sample.eventName === "question-locked" &&
              sample.measurement === "same-client-round-trip"
          )?.requestToReceived ?? null
      )
      .not.toBeNull()

    const sample = deliverySamples.find(
      (item) =>
        item.eventName === "question-locked" &&
        item.measurement === "same-client-round-trip"
    )
    expect(
      Number.parseFloat(sample?.requestToReceived ?? "NaN")
    ).toBeGreaterThanOrEqual(0)
  })

  test("自己保存与远端增量更新都不重复拉取快照", async ({
    scenario,
    ownerPage,
    collaboratorPage,
  }) => {
    await openEditorPair(
      ownerPage,
      collaboratorPage,
      scenario.surveyId,
      scenario.firstQuestionId
    )

    await ownerPage.waitForTimeout(300)

    const snapshotPath = `/api/surveys/${scenario.surveyId}`
    const updatePath = `${snapshotPath}/questions/${scenario.firstQuestionId}`
    let ownerSnapshotRequests = 0
    let collaboratorSnapshotRequests = 0
    let updateServerTiming: string | undefined
    let updateRequestId: string | undefined
    const incrementalResults: Array<Record<string, unknown>> = []
    ownerPage.on("request", (request) => {
      if (
        request.method() === "GET" &&
        new URL(request.url()).pathname === snapshotPath
      ) {
        ownerSnapshotRequests += 1
      }
    })
    collaboratorPage.on("request", (request) => {
      if (
        request.method() === "GET" &&
        new URL(request.url()).pathname === snapshotPath
      ) {
        collaboratorSnapshotRequests += 1
      }
    })
    ownerPage.on("response", (response) => {
      if (
        response.request().method() === "PUT" &&
        new URL(response.url()).pathname === updatePath
      ) {
        updateServerTiming = response.headers()["server-timing"]
        updateRequestId = response.headers()["x-request-id"]
      }
    })
    collaboratorPage.on("console", async (message) => {
      if (!message.text().includes("[Realtime Incremental Reconciliation]")) {
        return
      }
      const payload = await message.args()[1]?.jsonValue()
      if (payload && typeof payload === "object") {
        incrementalResults.push(payload as Record<string, unknown>)
      }
    })

    const ownerFirst = questionCard(ownerPage, scenario.firstQuestionId)
    await ownerFirst.getByText("E2E 第一题", { exact: true }).click()
    await expect(ownerFirst).toHaveAttribute("data-lock-state", "mine")

    const titleEditor = ownerPage.locator("aside textarea").first()
    await titleEditor.fill("只由远端拉取快照的标题")
    await titleEditor.blur()

    await expect(ownerPage.getByText("已保存", { exact: true })).toBeVisible()
    await expect(
      questionCard(collaboratorPage, scenario.firstQuestionId).getByText(
        "只由远端拉取快照的标题",
        { exact: true }
      )
    ).toBeVisible({ timeout: 15_000 })

    await expect
      .poll(() =>
        incrementalResults.some(
          (result) =>
            result.result === "applied" &&
            result.questionId === scenario.firstQuestionId
        )
      )
      .toBe(true)
    expect(ownerSnapshotRequests).toBe(0)
    expect(collaboratorSnapshotRequests).toBe(0)
    expect(updateServerTiming).toMatch(
      /auth;dur=.*permission;dur=.*database;dur=/
    )
    expect(updateRequestId).toBeTruthy()

    const snapshotResponse = await collaboratorPage.request.get(snapshotPath)
    expect(snapshotResponse.headers()["server-timing"]).toMatch(
      /auth;dur=.*database;dur=.*total;dur=/
    )
    expect(snapshotResponse.headers()["x-request-id"]).toBeTruthy()
  })

  test("远端陈旧事件被忽略，无效事件回退服务器快照", async ({
    scenario,
    ownerPage,
    collaboratorPage,
  }) => {
    await openEditorPair(
      ownerPage,
      collaboratorPage,
      scenario.surveyId,
      scenario.firstQuestionId
    )
    await ownerPage.waitForTimeout(300)

    const snapshotPath = `/api/surveys/${scenario.surveyId}`
    let ownerSnapshotRequests = 0
    ownerPage.on("request", (request) => {
      if (
        request.method() === "GET" &&
        new URL(request.url()).pathname === snapshotPath
      ) {
        ownerSnapshotRequests += 1
      }
    })

    const persisted = await prisma.question.findUniqueOrThrow({
      where: { id: scenario.firstQuestionId },
    })
    await publishQuestionUpdate(scenario.surveyId, {
      ...persisted,
      title: "增量事件中的新标题",
      revision: persisted.revision + 1,
    })
    await expect(
      questionCard(ownerPage, scenario.firstQuestionId).getByText(
        "增量事件中的新标题",
        { exact: true }
      )
    ).toBeVisible()
    expect(ownerSnapshotRequests).toBe(0)

    await publishQuestionUpdate(scenario.surveyId, {
      ...persisted,
      title: "不应覆盖新标题的陈旧事件",
    })
    await ownerPage.waitForTimeout(150)
    await expect(
      questionCard(ownerPage, scenario.firstQuestionId).getByText(
        "增量事件中的新标题",
        { exact: true }
      )
    ).toBeVisible()
    expect(ownerSnapshotRequests).toBe(0)

    await realtimeTestPublisher.trigger(
      getSurveyChannel(scenario.surveyId),
      COLLABORATION_EVENTS.QUESTION_UPDATED,
      {
        requestId: crypto.randomUUID(),
        clientId: "playwright-synthetic-remote",
        questionId: scenario.firstQuestionId,
        question: {
          id: scenario.firstQuestionId,
          revision: persisted.revision + 2,
        },
        fromUserId: "playwright-synthetic-remote",
        timestamp: new Date().toISOString(),
      }
    )

    await expect.poll(() => ownerSnapshotRequests).toBe(1)
    await expect(
      questionCard(ownerPage, scenario.firstQuestionId).getByText(
        "E2E 第一题",
        { exact: true }
      )
    ).toBeVisible()
  })

  test("远端更新撞上本地草稿时保留草稿并进入冲突处理", async ({
    scenario,
    ownerPage,
    collaboratorPage,
  }) => {
    await openEditorPair(
      ownerPage,
      collaboratorPage,
      scenario.surveyId,
      scenario.firstQuestionId
    )
    await ownerPage.waitForTimeout(300)

    const snapshotPath = `/api/surveys/${scenario.surveyId}`
    let ownerSnapshotRequests = 0
    ownerPage.on("request", (request) => {
      if (
        request.method() === "GET" &&
        new URL(request.url()).pathname === snapshotPath
      ) {
        ownerSnapshotRequests += 1
      }
    })

    const ownerFirst = questionCard(ownerPage, scenario.firstQuestionId)
    await ownerFirst.getByText("E2E 第一题", { exact: true }).click()
    await expect(ownerFirst).toHaveAttribute("data-lock-state", "mine")
    const titleEditor = ownerPage.locator("aside textarea").first()
    await titleEditor.fill("尚未保存的本地草稿")

    const persisted = await prisma.question.update({
      where: { id: scenario.firstQuestionId },
      data: {
        title: "远端已经保存的标题",
        revision: { increment: 1 },
      },
    })
    await publishQuestionUpdate(scenario.surveyId, persisted)

    await expect.poll(() => ownerSnapshotRequests).toBe(1)
    await expect(titleEditor).toHaveValue("尚未保存的本地草稿")
    await expect(
      ownerPage.getByText(
        "题目已被其他协作者更新，请选择保留本地修改或使用服务器版本"
      )
    ).toBeVisible()

    await titleEditor.blur()
    await ownerPage.waitForTimeout(150)
    await expect
      .poll(() =>
        prisma.question.findUnique({
          where: { id: scenario.firstQuestionId },
          select: { title: true },
        })
      )
      .toEqual({ title: "远端已经保存的标题" })

    await ownerPage.getByRole("button", { name: "使用服务器版本" }).click()
    await expect(titleEditor).toHaveValue("远端已经保存的标题")
  })

  test("协作者换锁并离开后，两端与数据库都正确释放锁", async ({
    scenario,
    ownerPage,
    collaboratorPage,
  }) => {
    await openEditorPair(
      ownerPage,
      collaboratorPage,
      scenario.surveyId,
      scenario.firstQuestionId
    )

    const ownerFirst = questionCard(ownerPage, scenario.firstQuestionId)
    const ownerSecond = questionCard(ownerPage, scenario.secondQuestionId)
    const collaboratorFirst = questionCard(
      collaboratorPage,
      scenario.firstQuestionId
    )
    const collaboratorSecond = questionCard(
      collaboratorPage,
      scenario.secondQuestionId
    )

    await collaboratorFirst.getByText("E2E 第一题", { exact: true }).click()
    await expect(collaboratorFirst).toHaveAttribute("data-lock-state", "mine")
    await expect(ownerFirst).toHaveAttribute("data-lock-state", "other")
    await expect(ownerFirst).toContainText("E2E 协作者正在编辑")

    await expect
      .poll(async () => {
        const locked = await prisma.question.findMany({
          where: { surveyId: scenario.surveyId, lockedBy: { not: null } },
          select: { id: true, lockedBy: true },
        })
        return locked
      })
      .toEqual([
        {
          id: scenario.firstQuestionId,
          lockedBy: scenario.collaboratorId,
        },
      ])

    await collaboratorSecond.getByText("E2E 第二题", { exact: true }).click()
    await expect(collaboratorFirst).toHaveAttribute("data-lock-state", "none")
    await expect(collaboratorSecond).toHaveAttribute("data-lock-state", "mine")
    await expect(ownerFirst).toHaveAttribute("data-lock-state", "none")
    await expect(ownerSecond).toHaveAttribute("data-lock-state", "other")

    await expect
      .poll(async () => {
        const locked = await prisma.question.findMany({
          where: { surveyId: scenario.surveyId, lockedBy: { not: null } },
          select: { id: true, lockedBy: true },
        })
        return locked
      })
      .toEqual([
        {
          id: scenario.secondQuestionId,
          lockedBy: scenario.collaboratorId,
        },
      ])

    await collaboratorPage.goto("/surveys")

    await expect(ownerSecond).toHaveAttribute("data-lock-state", "none")
    await expect
      .poll(() =>
        prisma.question.count({
          where: { surveyId: scenario.surveyId, lockedBy: { not: null } },
        })
      )
      .toBe(0)
  })

  test("连续新增后两端和数据库保持幂等且顺序连续", async ({
    scenario,
    ownerPage,
    collaboratorPage,
  }) => {
    await openEditorPair(
      ownerPage,
      collaboratorPage,
      scenario.surveyId,
      scenario.firstQuestionId
    )

    const ownerSnapshotRequests = trackSurveySnapshotRequests(
      ownerPage,
      scenario.surveyId
    )
    const collaboratorSnapshotRequests = trackSurveySnapshotRequests(
      collaboratorPage,
      scenario.surveyId
    )

    const addTextQuestion = collaboratorPage.getByRole("button", {
      name: "单行文本",
      exact: true,
    })

    for (let index = 0; index < 3; index += 1) {
      await addTextQuestion.click()
    }

    await expect(collaboratorPage.locator("[data-question-id]")).toHaveCount(5)
    await expect(collaboratorPage.locator('[data-pending="true"]')).toHaveCount(
      0,
      { timeout: 15_000 }
    )
    await expect(ownerPage.locator("[data-question-id]")).toHaveCount(5, {
      timeout: 15_000,
    })
    expect(ownerSnapshotRequests()).toBe(0)
    expect(collaboratorSnapshotRequests()).toBe(0)

    await expect
      .poll(async () => {
        const questions = await prisma.question.findMany({
          where: { surveyId: scenario.surveyId },
          orderBy: { order: "asc" },
          select: { id: true, clientMutationId: true, order: true },
        })

        return (
          questions.length === 5 &&
          new Set(questions.map((question) => question.id)).size === 5 &&
          questions.every((question) => question.clientMutationId) &&
          new Set(questions.map((question) => question.clientMutationId))
            .size === 5 &&
          questions.every((question, index) => question.order === index)
        )
      })
      .toBe(true)
  })

  test("远端排序和删除在两端增量生效且不拉取整卷快照", async ({
    scenario,
    ownerPage,
    collaboratorPage,
  }) => {
    await openEditorPair(
      ownerPage,
      collaboratorPage,
      scenario.surveyId,
      scenario.firstQuestionId
    )
    const ownerSnapshotRequests = trackSurveySnapshotRequests(
      ownerPage,
      scenario.surveyId
    )
    const collaboratorSnapshotRequests = trackSurveySnapshotRequests(
      collaboratorPage,
      scenario.surveyId
    )

    const reorderResponse = await collaboratorPage.request.put(
      `/api/surveys/${scenario.surveyId}/questions/reorder`,
      {
        data: {
          expectedStructureRevision: 0,
          questions: [
            { id: scenario.secondQuestionId, order: 0 },
            { id: scenario.firstQuestionId, order: 1 },
          ],
        },
      }
    )
    expect(reorderResponse.ok()).toBe(true)

    const reorderedIds = [scenario.secondQuestionId, scenario.firstQuestionId]
    await expect
      .poll(() => questionIdsInDisplayOrder(ownerPage))
      .toEqual(reorderedIds)
    await expect
      .poll(() => questionIdsInDisplayOrder(collaboratorPage))
      .toEqual(reorderedIds)
    expect(ownerSnapshotRequests()).toBe(0)
    expect(collaboratorSnapshotRequests()).toBe(0)

    const secondQuestion = await prisma.question.findUniqueOrThrow({
      where: { id: scenario.secondQuestionId },
      select: { revision: true },
    })
    const deleteResponse = await collaboratorPage.request.delete(
      `/api/surveys/${scenario.surveyId}/questions/${scenario.secondQuestionId}`,
      { data: { expectedRevision: secondQuestion.revision } }
    )
    expect(deleteResponse.ok()).toBe(true)

    await expect
      .poll(() => questionIdsInDisplayOrder(ownerPage))
      .toEqual([scenario.firstQuestionId])
    await expect
      .poll(() => questionIdsInDisplayOrder(collaboratorPage))
      .toEqual([scenario.firstQuestionId])
    expect(ownerSnapshotRequests()).toBe(0)
    expect(collaboratorSnapshotRequests()).toBe(0)
  })

  test("结构事件存在修订缺口时回退一次服务器快照", async ({
    scenario,
    ownerPage,
    collaboratorPage,
  }) => {
    await openEditorPair(
      ownerPage,
      collaboratorPage,
      scenario.surveyId,
      scenario.firstQuestionId
    )
    await ownerPage.waitForTimeout(300)
    const ownerSnapshotRequests = trackSurveySnapshotRequests(
      ownerPage,
      scenario.surveyId
    )

    await realtimeTestPublisher.trigger(
      getSurveyChannel(scenario.surveyId),
      COLLABORATION_EVENTS.QUESTION_CREATED,
      {
        requestId: crypto.randomUUID(),
        clientId: "playwright-synthetic-remote",
        question: {
          id: crypto.randomUUID(),
          type: "TEXT",
          title: "不应直接应用的缺口题目",
          required: false,
          order: 2,
          revision: 0,
          config: { placeholder: "", format: "any" },
        },
        structureRevision: 2,
        fromUserId: "playwright-synthetic-remote",
        timestamp: new Date().toISOString(),
      }
    )

    await expect.poll(() => ownerSnapshotRequests()).toBe(1)
    await expect(ownerPage.locator("[data-question-id]")).toHaveCount(2)
  })

  test("AI 批量新增整批提交且重放不重复", async ({
    scenario,
    ownerPage,
    collaboratorPage,
  }) => {
    await openEditorPair(
      ownerPage,
      collaboratorPage,
      scenario.surveyId,
      scenario.firstQuestionId
    )
    const ownerSnapshotRequests = trackSurveySnapshotRequests(
      ownerPage,
      scenario.surveyId
    )
    const collaboratorSnapshotRequests = trackSurveySnapshotRequests(
      collaboratorPage,
      scenario.surveyId
    )

    const batchId = crypto.randomUUID()
    const operationIds = [
      crypto.randomUUID(),
      crypto.randomUUID(),
      crypto.randomUUID(),
    ]
    const questions = operationIds.map((operationId, index) => ({
      operationId,
      title: `AI 批量题目 ${index + 1}`,
      type: "TEXT" as const,
      required: false,
      config: { placeholder: `批量输入 ${index + 1}`, format: "any" },
    }))
    const batchUrl = `/api/surveys/${scenario.surveyId}/questions/batch`

    const invalidResponse = await collaboratorPage.request.post(batchUrl, {
      data: {
        batchId,
        expectedStructureRevision: 0,
        questions: questions.map((question, index) =>
          index === 1 ? { ...question, title: "" } : question
        ),
      },
    })
    expect(invalidResponse.status()).toBe(400)
    await expect
      .poll(() =>
        prisma.question.count({
          where: {
            surveyId: scenario.surveyId,
            clientMutationId: { in: operationIds },
          },
        })
      )
      .toBe(0)

    const requestData = {
      batchId,
      expectedStructureRevision: 0,
      questions,
    }
    const createdResponse = await collaboratorPage.request.post(batchUrl, {
      data: requestData,
    })
    expect(createdResponse.status()).toBe(201)
    expect(createdResponse.headers()["x-idempotent-replay"]).toBe("false")
    expect(await createdResponse.json()).toMatchObject({
      batchId,
      structureRevision: 1,
      questions: questions.map((question, index) => ({
        title: question.title,
        order: index + 2,
      })),
    })

    const replayResponse = await collaboratorPage.request.post(batchUrl, {
      data: requestData,
    })
    expect(replayResponse.status()).toBe(200)
    expect(replayResponse.headers()["x-idempotent-replay"]).toBe("true")

    await expect(collaboratorPage.locator("[data-question-id]")).toHaveCount(
      5,
      { timeout: 15_000 }
    )
    await expect(ownerPage.locator("[data-question-id]")).toHaveCount(5, {
      timeout: 15_000,
    })
    expect(ownerSnapshotRequests()).toBe(0)
    expect(collaboratorSnapshotRequests()).toBe(0)

    const rejectedOperationId = crypto.randomUUID()
    const partialReplayResponse = await collaboratorPage.request.post(
      batchUrl,
      {
        data: {
          batchId: crypto.randomUUID(),
          expectedStructureRevision: 1,
          questions: [
            questions[0],
            {
              operationId: rejectedOperationId,
              title: "不应部分写入的题目",
              type: "TEXT",
              required: false,
              config: { placeholder: "", format: "any" },
            },
          ],
        },
      }
    )
    expect(partialReplayResponse.status()).toBe(409)
    expect(await partialReplayResponse.json()).toMatchObject({
      code: "BATCH_OPERATION_CONFLICT",
    })

    await expect
      .poll(async () => {
        const [survey, batchQuestionCount, rejectedQuestionCount] =
          await Promise.all([
            prisma.survey.findUnique({
              where: { id: scenario.surveyId },
              select: { structureRevision: true },
            }),
            prisma.question.count({
              where: {
                surveyId: scenario.surveyId,
                clientMutationId: { in: operationIds },
              },
            }),
            prisma.question.count({
              where: {
                surveyId: scenario.surveyId,
                clientMutationId: rejectedOperationId,
              },
            }),
          ])
        return {
          structureRevision: survey?.structureRevision,
          batchQuestionCount,
          rejectedQuestionCount,
        }
      })
      .toEqual({
        structureRevision: 1,
        batchQuestionCount: 3,
        rejectedQuestionCount: 0,
      })

    expect(ownerSnapshotRequests()).toBe(0)
    expect(collaboratorSnapshotRequests()).toBe(0)
  })

  test("题目保存失败时保留本地草稿并可重试", async ({
    scenario,
    ownerPage,
    collaboratorPage,
  }) => {
    await openEditorPair(
      ownerPage,
      collaboratorPage,
      scenario.surveyId,
      scenario.firstQuestionId
    )

    const firstQuestion = questionCard(
      collaboratorPage,
      scenario.firstQuestionId
    )
    await firstQuestion.getByText("E2E 第一题", { exact: true }).click()
    await expect(firstQuestion).toHaveAttribute("data-lock-state", "mine")

    const updateUrl = `**/api/surveys/${scenario.surveyId}/questions/${scenario.firstQuestionId}`
    await collaboratorPage.route(updateUrl, async (route) => {
      if (route.request().method() === "PUT") {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "模拟保存失败" }),
        })
        return
      }
      await route.continue()
    })

    const titleEditor = collaboratorPage.locator("aside textarea").first()
    await titleEditor.fill("本地未保存标题")
    await titleEditor.blur()

    await expect(
      collaboratorPage.getByText("模拟保存失败").first()
    ).toBeVisible()
    await expect(titleEditor).toHaveValue("本地未保存标题")
    await expect
      .poll(() =>
        prisma.question.findUnique({
          where: { id: scenario.firstQuestionId },
          select: { title: true },
        })
      )
      .toEqual({ title: "E2E 第一题" })

    await collaboratorPage.unroute(updateUrl)
    await collaboratorPage.getByRole("button", { name: "重试" }).click()

    await expect(
      collaboratorPage.getByText("已保存", { exact: true })
    ).toBeVisible()
    await expect(collaboratorPage.getByText("题目已保存")).toHaveCount(0)
    await expect
      .poll(() =>
        prisma.question.findUnique({
          where: { id: scenario.firstQuestionId },
          select: { title: true, revision: true },
        })
      )
      .toEqual({ title: "本地未保存标题", revision: 1 })
  })

  test("问卷标题和描述串行保存并反馈顶部状态", async ({
    scenario,
    ownerPage,
    collaboratorPage,
  }) => {
    await openEditorPair(
      ownerPage,
      collaboratorPage,
      scenario.surveyId,
      scenario.firstQuestionId
    )

    const ownerSnapshotRequests = trackSurveySnapshotRequests(
      ownerPage,
      scenario.surveyId
    )
    const collaboratorSnapshotRequests = trackSurveySnapshotRequests(
      collaboratorPage,
      scenario.surveyId
    )

    const updateUrl = `**/api/surveys/${scenario.surveyId}`
    const submittedBodies: Array<Record<string, unknown>> = []
    await collaboratorPage.route(updateUrl, async (route) => {
      if (route.request().method() !== "PUT") {
        await route.continue()
        return
      }
      submittedBodies.push(route.request().postDataJSON())
      await new Promise((resolve) => setTimeout(resolve, 600))
      await route.continue()
    })

    const titleEditor = collaboratorPage.locator("header input").first()
    await titleEditor.fill("串行保存后的问卷标题")
    await expect(
      collaboratorPage.getByText("保存中", { exact: true })
    ).toBeVisible()

    await collaboratorPage
      .getByText("由 Playwright 创建并在用例结束后清理", { exact: true })
      .click()
    const descriptionEditor = collaboratorPage.locator("textarea").first()
    await descriptionEditor.fill("串行保存后的问卷描述")
    await descriptionEditor.blur()

    await expect(
      collaboratorPage.getByText("已保存", { exact: true })
    ).toBeVisible({ timeout: 15_000 })
    expect(submittedBodies).toHaveLength(2)
    expect(submittedBodies.at(-1)).toMatchObject({
      title: "串行保存后的问卷标题",
      description: "串行保存后的问卷描述",
    })
    await expect
      .poll(() =>
        prisma.survey.findUnique({
          where: { id: scenario.surveyId },
          select: { title: true, description: true },
        })
      )
      .toEqual({
        title: "串行保存后的问卷标题",
        description: "串行保存后的问卷描述",
      })
    await expect(ownerPage.locator("header input").first()).toHaveValue(
      "串行保存后的问卷标题"
    )
    await expect(
      ownerPage.getByText("串行保存后的问卷描述", { exact: true })
    ).toBeVisible()
    expect(ownerSnapshotRequests()).toBe(0)
    expect(collaboratorSnapshotRequests()).toBe(0)
  })

  test("整卷设置保存失败时保留选择并可从顶部重试", async ({
    scenario,
    ownerPage,
    collaboratorPage,
  }) => {
    await openEditorPair(
      ownerPage,
      collaboratorPage,
      scenario.surveyId,
      scenario.firstQuestionId
    )

    const updateUrl = `**/api/surveys/${scenario.surveyId}`
    let shouldFail = true
    await collaboratorPage.route(updateUrl, async (route) => {
      if (route.request().method() !== "PUT" || !shouldFail) {
        await route.continue()
        return
      }
      shouldFail = false
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "模拟整卷设置保存失败" }),
      })
    })

    const showNumberSwitch = collaboratorPage.getByRole("switch")
    await showNumberSwitch.click()

    await expect(showNumberSwitch).not.toBeChecked()
    await expect(
      collaboratorPage.getByText("模拟整卷设置保存失败").first()
    ).toBeVisible()
    await expect(
      collaboratorPage.getByRole("button", { name: "重试问卷" })
    ).toBeVisible()
    await expect
      .poll(() =>
        prisma.survey.findUnique({
          where: { id: scenario.surveyId },
          select: { settings: true },
        })
      )
      .toEqual({ settings: { showQuestionNumber: true } })

    await collaboratorPage.getByRole("button", { name: "重试问卷" }).click()

    await expect(
      collaboratorPage.getByText("已保存", { exact: true })
    ).toBeVisible()
    await expect
      .poll(() =>
        prisma.survey.findUnique({
          where: { id: scenario.surveyId },
          select: { settings: true },
        })
      )
      .toEqual({ settings: { showQuestionNumber: false } })
  })

  test("问卷详情冲突时可以恢复服务器版本或保留本地修改", async ({
    scenario,
    ownerPage,
    collaboratorPage,
  }) => {
    await openEditorPair(
      ownerPage,
      collaboratorPage,
      scenario.surveyId,
      scenario.firstQuestionId
    )

    const titleEditor = collaboratorPage.locator("header input").first()
    await prisma.survey.update({
      where: { id: scenario.surveyId },
      data: {
        title: "服务器版本一",
        detailsRevision: { increment: 1 },
      },
    })

    await titleEditor.fill("稍后放弃的本地标题")
    await titleEditor.blur()
    await expect(
      collaboratorPage.getByRole("button", { name: "保留我的修改" })
    ).toBeVisible()
    await expect(
      collaboratorPage.getByRole("button", { name: "使用服务器版本" })
    ).toBeVisible()
    await expect(titleEditor).toHaveValue("稍后放弃的本地标题")

    await collaboratorPage
      .getByRole("button", { name: "使用服务器版本" })
      .click()
    await expect(titleEditor).toHaveValue("服务器版本一")
    await expect(
      collaboratorPage.getByRole("button", { name: "保留我的修改" })
    ).toHaveCount(0)

    await prisma.survey.update({
      where: { id: scenario.surveyId },
      data: {
        title: "服务器版本二",
        detailsRevision: { increment: 1 },
      },
    })

    await titleEditor.fill("最终保留的本地标题")
    await titleEditor.blur()
    await expect(
      collaboratorPage.getByRole("button", { name: "保留我的修改" })
    ).toBeVisible()
    await collaboratorPage.getByRole("button", { name: "保留我的修改" }).click()

    await expect(
      collaboratorPage.getByText("已保存", { exact: true })
    ).toBeVisible()
    await expect(titleEditor).toHaveValue("最终保留的本地标题")
    await expect
      .poll(() =>
        prisma.survey.findUnique({
          where: { id: scenario.surveyId },
          select: { title: true, detailsRevision: true },
        })
      )
      .toEqual({ title: "最终保留的本地标题", detailsRevision: 3 })
  })

  test("并发修改问卷详情时只有一个修订可以成功", async ({
    scenario,
    ownerPage,
    collaboratorPage,
  }) => {
    const ownerUpdate = ownerPage.request.put(
      `/api/surveys/${scenario.surveyId}`,
      {
        data: {
          expectedDetailsRevision: 0,
          title: "所有者并发标题",
          description: "所有者提交",
          settings: { showQuestionNumber: true },
        },
      }
    )
    const collaboratorUpdate = collaboratorPage.request.put(
      `/api/surveys/${scenario.surveyId}`,
      {
        data: {
          expectedDetailsRevision: 0,
          title: "协作者并发标题",
          description: "协作者提交",
          settings: { showQuestionNumber: false },
        },
      }
    )

    const responses = await Promise.all([ownerUpdate, collaboratorUpdate])
    expect(responses.map((response) => response.status()).sort()).toEqual([
      200, 409,
    ])

    const conflictResponse = responses.find(
      (response) => response.status() === 409
    )
    expect(await conflictResponse?.json()).toMatchObject({
      code: "SURVEY_DETAILS_REVISION_CONFLICT",
      current: { detailsRevision: 1 },
    })

    const persisted = await prisma.survey.findUnique({
      where: { id: scenario.surveyId },
      select: {
        title: true,
        description: true,
        settings: true,
        detailsRevision: true,
      },
    })
    expect(persisted?.detailsRevision).toBe(1)
    expect(["所有者并发标题", "协作者并发标题"]).toContain(persisted?.title)
  })

  test("陈旧题目修订号会返回冲突而不是覆盖新内容", async ({
    scenario,
    ownerPage,
    collaboratorPage,
  }) => {
    const initial = await prisma.question.findUniqueOrThrow({
      where: { id: scenario.firstQuestionId },
      select: { revision: true },
    })

    const first = await ownerPage.request.put(
      `/api/surveys/${scenario.surveyId}/questions/${scenario.firstQuestionId}`,
      {
        data: {
          expectedRevision: initial.revision,
          title: "所有者的新标题",
        },
      }
    )
    expect(first.ok()).toBe(true)

    const stale = await collaboratorPage.request.put(
      `/api/surveys/${scenario.surveyId}/questions/${scenario.firstQuestionId}`,
      {
        data: {
          expectedRevision: initial.revision,
          title: "协作者的陈旧标题",
        },
      }
    )
    expect(stale.status()).toBe(409)
    expect(await stale.json()).toMatchObject({
      code: "QUESTION_REVISION_CONFLICT",
      current: { title: "所有者的新标题", revision: initial.revision + 1 },
    })

    await expect
      .poll(() =>
        prisma.question.findUnique({
          where: { id: scenario.firstQuestionId },
          select: { title: true },
        })
      )
      .toEqual({ title: "所有者的新标题" })
  })

  test("题目被协作者锁定时修改接口拒绝其他用户", async ({
    scenario,
    ownerPage,
    collaboratorPage,
  }) => {
    const lock = await collaboratorPage.request.post(
      "/api/surveys/collaboration/lock",
      {
        data: {
          surveyId: scenario.surveyId,
          questionId: scenario.firstQuestionId,
        },
      }
    )
    expect(lock.ok()).toBe(true)

    const question = await prisma.question.findUniqueOrThrow({
      where: { id: scenario.firstQuestionId },
      select: { revision: true },
    })
    const update = await ownerPage.request.put(
      `/api/surveys/${scenario.surveyId}/questions/${scenario.firstQuestionId}`,
      {
        data: {
          expectedRevision: question.revision,
          title: "不应保存的标题",
        },
      }
    )

    expect(update.status()).toBe(409)
    expect(await update.json()).toMatchObject({ code: "QUESTION_LOCKED" })
  })

  test("陈旧结构修订号不能覆盖新的题目顺序", async ({
    scenario,
    ownerPage,
    collaboratorPage,
  }) => {
    const survey = await prisma.survey.findUniqueOrThrow({
      where: { id: scenario.surveyId },
      select: { structureRevision: true },
    })

    const first = await ownerPage.request.put(
      `/api/surveys/${scenario.surveyId}/questions/reorder`,
      {
        data: {
          expectedStructureRevision: survey.structureRevision,
          questions: [
            { id: scenario.secondQuestionId, order: 0 },
            { id: scenario.firstQuestionId, order: 1 },
          ],
        },
      }
    )
    expect(first.ok()).toBe(true)

    const stale = await collaboratorPage.request.put(
      `/api/surveys/${scenario.surveyId}/questions/reorder`,
      {
        data: {
          expectedStructureRevision: survey.structureRevision,
          questions: [
            { id: scenario.firstQuestionId, order: 0 },
            { id: scenario.secondQuestionId, order: 1 },
          ],
        },
      }
    )
    expect(stale.status()).toBe(409)
    expect(await stale.json()).toMatchObject({
      code: "STRUCTURE_REVISION_CONFLICT",
    })

    const persisted = await prisma.question.findMany({
      where: { surveyId: scenario.surveyId },
      orderBy: { order: "asc" },
      select: { id: true },
    })
    expect(persisted.map((question) => question.id)).toEqual([
      scenario.secondQuestionId,
      scenario.firstQuestionId,
    ])
  })
})
