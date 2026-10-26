import { defineConfig, devices } from "@playwright/test";

import { TEST_DATABASE_URL, TEST_PORT } from "./tests/e2e/test-users";

/*
  Сквозные тесты: настоящий браузер против dev-сервера на своей базе.

  Порт 3013, а не 3000: на 3000 обычно уже работает dev-сервер
  разработчика, и тесты не должны ни мешать ему, ни случайно идти в его
  базу. База prisma/test.db пересоздаётся перед запуском сервера — сид
  прежнего сайта плюс тестовый администратор (tests/e2e/prepare-db.ts).

  Тесты идут по одному: отправка сообщения ограничена по частоте с одного
  адреса, а все тесты ходят с одного и того же.
*/
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  // dev-сервер собирает страницу при первом заходе — это долго.
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${TEST_PORT}`,
    trace: "retain-on-failure",
    navigationTimeout: 60_000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npx tsx tests/e2e/prepare-db.ts && npx next dev -p ${TEST_PORT}`,
    url: `http://localhost:${TEST_PORT}/ru`,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
    env: {
      DATABASE_URL: TEST_DATABASE_URL,
      SITE_URL: `http://localhost:${TEST_PORT}`,
      // Внешние сервисы в тестах выключены: оценку снимает разбор по словам.
      ML_SERVICE_URL: "",
      SMTP_HOST: "",
    },
  },
});
