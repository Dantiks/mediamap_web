import { expect, test } from "@playwright/test";

// Аккаунт заявителя: регистрация, «История» в кабинете, выход и вход.

const email = () => `e2e-${Date.now()}-${Math.floor(Math.random() * 1e6)}@mediamap.test`;
const PASSWORD = "e2e-reporter-pass";

test("регистрация → кабинет → подача → история → выход → вход", async ({ page }) => {
  const address = email();

  await page.goto("/ru/account/register");
  const register = page.locator("main form").first();
  await register.locator('input[name="email"]').fill(address);
  await register.locator('input[name="password"]').fill(PASSWORD);
  await register.locator('button[type="submit"]').click();

  await expect(page).toHaveURL(/\/ru\/account$/);
  await expect(page.locator("main")).toContainText(address);

  // Сообщение, поданное из аккаунта, попадает в его историю.
  await page.goto("/ru/report");
  const form = page.locator("main form").first();
  await form.locator('input[name="typeSlug"][value="digital-fraud"]').check({ force: true });
  await form
    .locator('textarea[name="story"]')
    .fill("Мошенники рассылают смс о выигрыше и просят перевести деньги на карту для получения приза.");
  await form.locator('input[name="consent"]').check({ force: true });
  await form.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/ru\/report\/sent\//, { timeout: 60_000 });
  const publicId = (await page.locator("main").innerText()).match(/MM-\d{4}-\d{4}/)![0];

  await page.goto("/ru/account");
  await expect(page.locator("main")).toContainText(publicId);

  // Выход.
  await page.locator("main form button[type=submit]").first().click();
  await expect(page).toHaveURL(/\/ru$/);
  await page.goto("/ru/account");
  await expect(page).toHaveURL(/\/ru\/account\/login$/);

  // Вход с неверным паролем не пускает, с верным — пускает.
  const login = page.locator("main form").first();
  await login.locator('input[name="email"]').fill(address);
  await login.locator('input[name="password"]').fill("не тот пароль");
  await login.locator('button[type="submit"]').click();
  // Дожидаемся ответа: после действия React сбрасывает поля формы, и
  // введённый раньше пароль стёрся бы.
  await expect(page.locator("main")).toContainText("Не подошло");
  await expect(page).toHaveURL(/\/ru\/account\/login$/);

  await login.locator('input[name="password"]').fill(PASSWORD);
  await login.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/ru\/account$/);
  await expect(page.locator("main")).toContainText(publicId);
});

test("регистрация и выход на кыргызской версии остаются на кыргызском", async ({ page }) => {
  await page.goto("/ky/account/register");
  const register = page.locator("main form").first();
  await register.locator('input[name="email"]').fill(email());
  await register.locator('input[name="password"]').fill(PASSWORD);
  await register.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/ky\/account$/);

  await page.locator("main form button[type=submit]").first().click();
  await expect(page).toHaveURL(/\/ky$/);
});

test("кабинет без входа ведёт на страницу входа", async ({ page }) => {
  await page.goto("/ky/account");
  await expect(page).toHaveURL(/\/ky\/account\/login$/);
});
