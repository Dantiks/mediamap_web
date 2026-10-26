import { expect, test } from "@playwright/test";

// «Проверь себя»: список тестов и прохождение одного.

test("на списке шесть тестов на всех языках", async ({ page }) => {
  for (const lang of ["ru", "ky", "en"]) {
    await page.goto(`/${lang}/quiz`);
    await expect(page.locator(`main a[href^="/${lang}/quiz/"]`)).toHaveCount(6);
  }
});

test("прохождение: ответ фиксируется, после всех — балл", async ({ page }) => {
  await page.goto("/ru/quiz/criticism");
  const questions = page.locator("main fieldset");
  await expect(questions).toHaveCount(7);

  // Первое задание: выбираем первый вариант и смотрим пояснение.
  const first = questions.nth(0);
  await first.locator("input[type=radio]").nth(0).check();
  const status = first.locator('[role="status"]');
  await expect(status).toContainText(/Верно|Неверно/);
  await expect(status).toContainText("Почему:");

  // Ответ не меняется после пояснения.
  await first.locator("label").nth(1).click();
  await expect(first.locator("input[type=radio]").nth(0)).toBeChecked();

  for (let index = 1; index < 7; index += 1) {
    await questions.nth(index).locator("label").nth(0).click();
  }
  await expect(page.getByTestId("quiz-score")).toHaveText(/^\d из 7$/);

  // «Пройти заново» сбрасывает ответы.
  await page.getByRole("button", { name: "Пройти заново" }).click();
  await expect(page.getByTestId("quiz-score")).toHaveCount(0);
  await expect(page.locator("main input[type=radio]:checked")).toHaveCount(0);
});

test("все правильные ответы дают 7 из 7", async ({ page }) => {
  // Правильный вариант узнаём из первого прохода: после ответа он
  // подсвечен. Порядок вариантов от перезагрузки не меняется.
  await page.goto("/ru/quiz/threats");
  const answers: number[] = [];
  for (let index = 0; index < 7; index += 1) {
    const question = page.locator("main fieldset").nth(index);
    await question.locator("label").nth(0).click();
    answers.push(
      await question
        .locator("label")
        .evaluateAll((labels) => labels.findIndex((label) => label.className.includes("trust-high"))),
    );
  }
  expect(answers.every((right) => right >= 0)).toBe(true);

  await page.reload();
  for (const [index, right] of answers.entries()) {
    await page.locator("main fieldset").nth(index).locator("label").nth(right).click();
  }
  await expect(page.getByTestId("quiz-score")).toHaveText("7 из 7");
});

test("неизвестный тест — 404", async ({ page }) => {
  const response = await page.goto("/ru/quiz/no-such-quiz");
  expect(response?.status()).toBe(404);
});
