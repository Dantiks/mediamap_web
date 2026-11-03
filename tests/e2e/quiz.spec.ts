import { expect, test } from "@playwright/test";

// «Проверь себя»: список тестов и прохождение одного.

test("на списке шесть тестов на всех языках", async ({ page }) => {
  for (const lang of ["ru", "ky", "en"]) {
    await page.goto(`/${lang}/quiz`);
    await expect(page.locator(`main a[href^="/${lang}/quiz/"]`)).toHaveCount(6);
  }
});

test("прохождение: по одному заданию, ответ фиксируется, в конце балл", async ({ page }) => {
  await page.goto("/ru/quiz/criticism");
  const question = page.locator("main fieldset");
  await expect(question).toHaveCount(1);
  await expect(page.getByText("Задание 1 из 7")).toBeVisible();

  // Первое задание: выбираем первый вариант и смотрим пояснение.
  await question.locator("label").nth(0).click();
  const status = question.locator('[role="status"]');
  await expect(status).toContainText(/Верно|Неверно/);
  await expect(status).toContainText("Почему:");

  // Ответ не меняется после пояснения.
  await question.locator("label").nth(1).click();
  await expect(question.locator("input[type=radio]").nth(0)).toBeChecked();

  for (let index = 1; index < 7; index += 1) {
    await page.getByRole("button", { name: "Следующее задание" }).click();
    await expect(page.getByText(`Задание ${index + 1} из 7`)).toBeVisible();
    await page.locator("main fieldset label").nth(0).click();
  }
  await page.getByRole("button", { name: "Показать результат" }).click();
  await expect(page.getByTestId("quiz-score")).toHaveText(/^\d из 7$/);

  // Из итога можно вернуться к разбору задания.
  await page.getByRole("button", { name: /Задание 3 из 7/ }).click();
  await expect(page.locator("main fieldset [role=status]")).toContainText("Почему:");

  // «Пройти заново» сбрасывает ответы.
  await page.getByRole("button", { name: "Показать результат" }).click();
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
    if (index > 0) await page.getByRole("button", { name: "Следующее задание" }).click();
    const labels = page.locator("main fieldset label");
    await labels.nth(0).click();
    answers.push(
      await labels.evaluateAll((list) => list.findIndex((label) => label.className.includes("trust-high"))),
    );
  }
  expect(answers.every((right) => right >= 0)).toBe(true);

  await page.reload();
  for (const [index, right] of answers.entries()) {
    if (index > 0) await page.getByRole("button", { name: "Следующее задание" }).click();
    await page.locator("main fieldset label").nth(right).click();
  }
  await page.getByRole("button", { name: "Показать результат" }).click();
  await expect(page.getByTestId("quiz-score")).toHaveText("7 из 7");
});

test("неизвестный тест — 404", async ({ page }) => {
  const response = await page.goto("/ru/quiz/no-such-quiz");
  expect(response?.status()).toBe(404);
});
