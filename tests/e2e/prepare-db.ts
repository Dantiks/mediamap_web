/**
 * Тестовая база для e2e: с нуля, миграциями, сидом и администратором.
 *
 *   npx tsx tests/e2e/prepare-db.ts
 *
 * Зовётся из playwright.config.ts перед запуском dev-сервера. Рабочую
 * prisma/dev.db не трогает: адрес базы задан здесь явно.
 */

import { execSync } from "node:child_process";
import { rmSync } from "node:fs";

import { TEST_ADMIN, TEST_DATABASE_URL } from "./test-users";

const env = {
  ...process.env,
  DATABASE_URL: TEST_DATABASE_URL,
  ADMIN_EMAIL: TEST_ADMIN.email,
  ADMIN_PASSWORD: TEST_ADMIN.password,
  ADMIN_NAME: "E2E Admin",
};

for (const suffix of ["", "-journal", "-wal", "-shm"]) {
  rmSync(`prisma/test.db${suffix}`, { force: true });
}

const run = (command: string) => execSync(command, { stdio: "inherit", env });

run("npx prisma migrate deploy");
run("npx tsx prisma/seed.ts");
run("npx tsx scripts/create-admin.ts");
