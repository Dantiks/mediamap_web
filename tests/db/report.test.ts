import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", async () => {
  const mocks = await import("./next-mocks");
  return { cookies: mocks.cookiesMock, headers: mocks.headersMock };
});
vi.mock("next/navigation", async () => ({
  redirect: (await import("./next-mocks")).redirectMock,
}));
// Перевод разбора после ответа здесь не нужен: он ходит в сервис переводов.
vi.mock("next/server", async () => ({ after: (await import("./next-mocks")).afterMock }));

import { db } from "@/lib/db";
import { loadReceipt } from "@/server/case-data";
import { submitReport } from "@/server/report-actions";
import { seedTypes, wipe } from "./db-helpers";
import { redirectOf, resetRequest } from "./next-mocks";

const STORY =
  "В группе в фейсбуке под постом о мигрантах пишут, что их надо выгнать из города и не пускать на рынки.";

function reportForm(fields: Record<string, string> = {}) {
  const data = new FormData();
  const all = {
    lang: "ky",
    typeSlug: "hate-speech",
    link: "https://facebook.com/groups/1/posts/2",
    story: STORY,
    city: "Ош",
    regionCode: "osh",
    happenedAt: "",
    consent: "on",
    trap: "",
    ...fields,
  };
  for (const [key, value] of Object.entries(all)) data.set(key, value);
  return data;
}

beforeEach(async () => {
  await wipe();
  await seedTypes();
  resetRequest();
});

describe("submitReport", () => {
  it("принимает сообщение, ставит в очередь и ведёт на страницу «принято» на том же языке", async () => {
    const url = await redirectOf(submitReport({ status: "idle" }, reportForm()));
    expect(url).toMatch(/^\/ky\/report\/sent\/[0-9a-f-]{36}$/);

    const report = await db.report.findFirstOrThrow({ include: { violationType: true } });
    expect(report).toMatchObject({
      status: "PENDING",
      city: "Ош",
      regionCode: "osh",
      authorId: null,
      aiSource: "rules",
      mediaLink: "https://facebook.com/groups/1/posts/2",
    });
    expect(report.violationType.slug).toBe("hate-speech");
    expect(report.publicId).toMatch(new RegExp(`^MM-${new Date().getFullYear()}-0001$`));
    expect(url.endsWith(report.receiptToken!)).toBe(true);

    // Проверка разбора легла в журнал.
    expect(await db.aiCheck.count()).toBe(1);
  });

  it("номера идут подряд", async () => {
    await redirectOf(submitReport({ status: "idle" }, reportForm()));
    await redirectOf(submitReport({ status: "idle" }, reportForm()));
    const ids = (await db.report.findMany({ orderBy: { id: "asc" } })).map((row) => row.publicId);
    expect(ids.map((id) => id.slice(-4))).toEqual(["0001", "0002"]);
  });

  it("страница «принято» находит сообщение по ключу", async () => {
    const url = await redirectOf(submitReport({ status: "idle" }, reportForm()));
    const receipt = await loadReceipt(url.split("/").pop()!);
    expect(receipt).toMatchObject({ status: "PENDING", typeSlug: "hate-speech", city: "Ош" });
    expect(receipt?.ai?.source).toBe("rules");
  });

  it("ошибки возвращает по полям и сохраняет набранное", async () => {
    const state = await submitReport(
      { status: "idle" },
      reportForm({ story: "коротко", consent: "", link: "не ссылка" }),
    );
    expect(state.status).toBe("error");
    if (state.status !== "error") return;
    expect(state.errors).toMatchObject({
      story: "storyShort",
      consent: "consentRequired",
      link: "linkInvalid",
    });
    expect(state.values.story).toBe("коротко");
    expect(await db.report.count()).toBe(0);
  });

  it("подменённый вид нарушения не проходит", async () => {
    const state = await submitReport({ status: "idle" }, reportForm({ typeSlug: "no-such-type" }));
    expect(state).toMatchObject({ status: "error", errors: { typeSlug: "typeRequired" } });
    expect(await db.report.count()).toBe(0);
  });

  it("ловушка для роботов: заполненное скрытое поле — отказ", async () => {
    const state = await submitReport({ status: "idle" }, reportForm({ trap: "spam" }));
    expect(state.status).toBe("error");
    expect(await db.report.count()).toBe(0);
  });

  it("шестая отправка подряд с одного адреса упирается в паузу", async () => {
    for (let index = 0; index < 5; index += 1) {
      await redirectOf(submitReport({ status: "idle" }, reportForm()));
    }
    const state = await submitReport({ status: "idle" }, reportForm());
    expect(state).toMatchObject({ status: "error", errors: { form: "tooOften:30" } });
    expect(await db.report.count()).toBe(5);
  });

  it("пустая дата — значит сегодня, в полдень по UTC", async () => {
    await redirectOf(submitReport({ status: "idle" }, reportForm()));
    const report = await db.report.findFirstOrThrow();
    expect(report.happenedAt?.toISOString()).toMatch(/T12:00:00\.000Z$/);
  });
});
