# Тесты на прочность (security-tests)

Скрипты для локальной проверки прод-сборки сайта. Против боевого сайта не запускать.

## Как запускать
1. Отдельная тестовая база и окружение (НЕ боевые):
   - свой `.env` c `DATABASE_URL` на временный файл и `SECRETS_KEY` из `openssl rand -hex 32`;
   - `SITE_URL` — любой нелокальный адрес (напр. `http://mediamap.test:3016`), иначе прод-сборка
     не стартует (проверка в `src/instrumentation.ts`).
2. `npx prisma migrate deploy && npx tsx prisma/seed.ts`
3. `NODE_ENV=production npx next start -H 127.0.0.1 -p 3016`

## Скрипты
- `load-home.mjs <url> <concurrency> <seconds>` — нагрузочный тест страницы.
  Пример: `node scripts/security-tests/load-home.mjs http://127.0.0.1:3016/ru 50 15`

Результат последнего прогона (ноутбук, прод-сборка): ~71 запрос/с, 0 ошибок,
p50 0,57 c / p99 2,1 c при 50 параллельных на `/ru`.
