import { expect, test } from "@playwright/test";

import { TEST_ADMIN } from "./test-users";

// Панель: вход тестовым администратором из tests/e2e/prepare-db.ts.

test("без входа панель ведёт на /admin/login", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login$/);
});

test("неверный пароль не пускает", async ({ page }) => {
  await page.goto("/admin/login");
  await page.locator("#email").fill(TEST_ADMIN.email);
  await page.locator("#password").fill("неверный-пароль-123");
  await page.locator('main button[type="submit"]').click();
  await expect(page).toHaveURL(/\/admin\/login$/);
});

test("администратор входит и видит очередь сообщений и разделы", async ({ page }) => {
  await page.goto("/admin/login");
  await page.locator("#email").fill(TEST_ADMIN.email);
  await page.locator("#password").fill(TEST_ADMIN.password);
  await page.locator('main button[type="submit"]').click();

  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.locator("h1")).toHaveText("Сообщения");

  for (const path of ["/admin/news", "/admin/texts", "/admin/ai"]) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(200);
    await expect(page).toHaveURL(new RegExp(`${path}$`));
  }
});
