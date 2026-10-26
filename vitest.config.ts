import path from "node:path";
import { defineConfig } from "vitest/config";

/*
  Юнит-тесты и тесты серверного кода с базой.

  База своя, отдельная от dev.db: тесты чистят таблицы, и рабочие данные
  разработчика пропали бы при первом же прогоне. Файл создаётся заново в
  tests/global-setup.ts, миграциями, — так база в тестах та же, что на
  сервере.

  Файлы идут по одному, не параллельно: база одна на всех, и два файла,
  чистящие одну таблицу одновременно, ловили бы чужие записи.
*/
const TEST_DATABASE_URL = "file:./prisma/vitest.db";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  test: {
    include: ["tests/unit/**/*.test.ts", "tests/db/**/*.test.ts"],
    globalSetup: ["tests/global-setup.ts"],
    fileParallelism: false,
    env: {
      DATABASE_URL: TEST_DATABASE_URL,
      // Модель в тестах не спрашиваем: оценку снимает разбор по словам.
      ML_SERVICE_URL: "",
      SMTP_HOST: "",
      // Часовой пояс машины не должен влиять на даты: их показываем по
      // Бишкеку, и тест обязан это проверять, а не совпадать случайно.
      TZ: "UTC",
    },
  },
});
