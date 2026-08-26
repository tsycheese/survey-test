import type { Page } from "@playwright/test"
import { expect, prisma, test } from "./fixtures/collaboration"

function questionCard(page: Page, questionId: string) {
  return page.locator(`[data-question-id="${questionId}"]`)
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
