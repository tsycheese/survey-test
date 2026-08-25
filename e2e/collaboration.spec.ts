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
})
