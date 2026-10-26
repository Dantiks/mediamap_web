import { expect, test } from "@playwright/test";

// Подача сообщения о нарушении без аккаунта и «Мои сообщения» в том же браузере.

const STORY =
  "В комментариях под постом о приезжих пишут, что их надо выгнать из города и не пускать на рынки.";

test("анонимная подача: форма → «принято» → «Мои сообщения»", async ({ page }) => {
  await page.goto("/ru/report");
  const form = page.locator("main form").first();

  await form.locator('input[name="typeSlug"][value="hate-speech"]').check({ force: true });
  await form.locator('textarea[name="story"]').fill(STORY);
  await form.locator('input[name="link"]').fill("https://facebook.com/groups/1/posts/2");
  await form.locator('input[name="city"]').fill("Ош");
  await form.locator('input[name="consent"]').check({ force: true });
  await form.locator('button[type="submit"]').click();

  await expect(page).toHaveURL(/\/ru\/report\/sent\/[0-9a-f-]{36}$/, { timeout: 60_000 });
  const publicId = (await page.locator("main").innerText()).match(/MM-\d{4}-\d{4}/)?.[0];
  expect(publicId).toBeTruthy();

  // Ключ запоминается в браузере — список своих сообщений его показывает.
  await page.goto("/ru/report/my");
  await expect(page.locator("main")).toContainText(publicId!);

  // До проверки случай не опубликован.
  await page.goto(`/ru/cases/${publicId}`);
  await expect(page.locator("h1")).toHaveText("Такого случая нет");
});

test("пустая форма не уходит и показывает ошибки у полей", async ({ page }) => {
  await page.goto("/ru/report");
  const form = page.locator("main form").first();
  await form.locator('textarea[name="story"]').fill("коротко");
  await form.locator('button[type="submit"]').click();

  await expect(page).toHaveURL(/\/ru\/report$/);
  await expect(form.locator('[aria-invalid="true"]').first()).toBeVisible();
});
