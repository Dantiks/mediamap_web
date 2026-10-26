// Тестовые учётные записи e2e. Живут только в prisma/test.db, которая
// пересоздаётся перед каждым прогоном; к рабочей базе отношения не имеют.

export const TEST_ADMIN = {
  email: "admin@mediamap.test",
  password: "e2e-admin-password-2026",
};

export const TEST_PORT = 3013;
export const TEST_DATABASE_URL = "file:./prisma/test.db";
