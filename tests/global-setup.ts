import { execSync } from "node:child_process";
import { rmSync } from "node:fs";

// Свежая база перед каждым прогоном: миграции с нуля, без сида. Данные
// каждый тест заводит себе сам — так видно, от чего зависит проверка.

const FILE = "prisma/vitest.db";

export default function setup(): void {
  for (const suffix of ["", "-journal", "-wal", "-shm"]) {
    rmSync(FILE + suffix, { force: true });
  }
  execSync("npx prisma migrate deploy", {
    stdio: "pipe",
    env: { ...process.env, DATABASE_URL: `file:./${FILE}` },
  });
}
