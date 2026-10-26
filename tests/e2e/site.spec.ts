import { expect, test } from "@playwright/test";

// Публичная часть: языки, поиск, случаи, мобильная ширина.

test.describe("главная", () => {
  for (const [lang, htmlLang] of [
    ["ru", "ru"],
    ["ky", "ky"],
    ["en", "en"],
  ] as const) {
    test(`открывается на ${lang}`, async ({ page }) => {
      const response = await page.goto(`/${lang}`);
      expect(response?.status()).toBe(200);
      await expect(page.locator("html")).toHaveAttribute("lang", htmlLang);
      await expect(page.locator("h1").first()).toBeVisible();
      await expect(page.locator("header")).toBeVisible();
      await expect(page.locator("footer")).toBeVisible();
    });
  }

  test("корень ведёт на кыргызскую версию", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/ky$/);
  });

  test("на кыргызском даты через точку, без ICU-шного 2026-26-10", async ({ page }) => {
    await page.goto("/ky/cases");
    const text = await page.locator("main").innerText();
    expect(text).toMatch(/\b\d{2}\.\d{2}\.\d{4}\b/);
    expect(text).not.toMatch(/\b\d{4}-\d{2}-\d{2}\b/);
  });

  test("неготовый язык ведёт на кыргызский с тем же путём", async ({ page }) => {
    await page.goto("/uz/about");
    await expect(page).toHaveURL(/\/ky\/about$/);
  });
});

test.describe("случаи", () => {
  test("из списка открывается страница случая", async ({ page }) => {
    await page.goto("/ru/cases");
    const first = page.locator('main a[href^="/ru/cases/MM-"]').first();
    const href = await first.getAttribute("href");
    expect(href).toBeTruthy();
    await first.click();
    await expect(page).toHaveURL(new RegExp(`${href}$`));
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator("main")).toContainText(href!.split("/").pop()!);
  });

  /*
    Страница отвечает 200 и пишет «Такого случая нет» — так сделано
    намеренно (своё сообщение со ссылкой назад), поэтому проверяем текст,
    а не код ответа.
  */
  test("несуществующий случай — понятное сообщение", async ({ page }) => {
    await page.goto("/ru/cases/MM-1999-9999");
    await expect(page.locator("h1")).toHaveText("Такого случая нет");
  });
});

test.describe("поиск", () => {
  test("находит случаи и виды нарушений по запросу из формы", async ({ page }) => {
    await page.goto("/ru/search");
    const field = page.locator('main input[name="q"]');
    await field.fill("Бишкек");
    await field.press("Enter");
    await expect(page).toHaveURL(/q=%D0%91|q=Бишкек/);
    await expect(page.locator('main a[href^="/ru/cases/MM-"]').first()).toBeVisible();
  });

  test("ищет без учёта регистра: «бишкек» и «БИШКЕК» дают одно и то же", async ({ page }) => {
    await page.goto("/ru/search?q=" + encodeURIComponent("бишкек"));
    const lower = await page.locator('main a[href^="/ru/cases/"]').count();
    await page.goto("/ru/search?q=" + encodeURIComponent("БИШКЕК"));
    const upper = await page.locator('main a[href^="/ru/cases/"]').count();
    expect(lower).toBeGreaterThan(0);
    expect(upper).toBe(lower);
  });
});

test.describe("мобильная ширина", () => {
  test.use({ viewport: { width: 360, height: 780 } });

  const pages = [
    "/ru",
    "/ky",
    "/en",
    "/ru/cases",
    "/ru/report",
    "/ru/search?q=" + encodeURIComponent("фейк"),
    "/ru/news",
    "/ru/analytics",
    "/ru/types",
    "/ru/quiz",
    "/ru/quiz/criticism",
    "/ru/account/login",
  ];

  /*
    БАГ. /analytics шире 360 px: помесячные столбики (components/analytics/
    Bars.tsx) — двенадцать flex-1 с подписями, и без min-w-0 они не
    сжимаются уже 386 px. На iPhone SE / mini (375) и большинстве Android
    (360) страница ездит вбок. Помечено test.fail: когда исправят, тест
    упадёт — убрать путь из этого списка.
  */
  const KNOWN_OVERFLOW = new Set(["/ru/analytics"]);

  for (const path of pages) {
    test(`без горизонтальной прокрутки: ${decodeURIComponent(path)}`, async ({ page }) => {
      test.fail(KNOWN_OVERFLOW.has(path), "известный баг: Bars.tsx шире экрана");
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      const overflow = await page.evaluate(() => {
        const root = document.documentElement;
        const wide = [...document.querySelectorAll<HTMLElement>("body *")]
          .filter((element) => element.getBoundingClientRect().right > root.clientWidth + 1)
          .filter((element) => getComputedStyle(element).position !== "fixed")
          .slice(0, 3)
          .map((element) => `${element.tagName.toLowerCase()}.${element.className}`.slice(0, 120));
        return { scroll: root.scrollWidth, client: root.clientWidth, wide };
      });
      expect(overflow.scroll, `шире экрана: ${overflow.wide.join(" | ")}`).toBeLessThanOrEqual(
        overflow.client,
      );
    });
  }
});
