import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "@/lib/db";
import { collectNews } from "@/server/news-collect";
import { ATOM, RSS } from "../fixtures/feeds";
import { wipe } from "./db-helpers";

/*
  Сборщик целиком: ленты подменяем ответами из fixtures, базу — тестовой.
  Время прибито к 26 октября 2026: в лентах даты этого месяца, а заметки
  старше 60 дней сборщик не берёт.
*/

const FEEDS: Record<string, () => Response> = {
  "https://24.kg/rss": () => new Response(RSS, { status: 200 }),
  "https://kloop.kg/atom": () => new Response(ATOM, { status: 200 }),
  "https://down.kg/rss": () => new Response("Service Unavailable", { status: 503 }),
};

beforeEach(async () => {
  await wipe();
  vi.useFakeTimers({ now: new Date("2026-10-26T06:00:00Z"), toFake: ["Date"] });
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => (FEEDS[url] ?? (() => new Response("", { status: 404 })))()),
  );
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("collectNews", () => {
  it("берёт только заметки с ключевыми словами языка ленты", async () => {
    const source = await db.newsSource.create({
      data: { name: "24.kg", feedUrl: "https://24.kg/rss", lang: "ru" },
    });
    await db.newsKeyword.createMany({
      data: [
        { word: "язык вражды", lang: "ru" },
        { word: "мошенничеств", lang: "ru" },
        // Выключенное слово не считается.
        { word: "2026", lang: "ru", enabled: false },
        // Слово другого языка к русской ленте не применяется.
        { word: "дата", lang: "ky" },
      ],
    });

    const report = await collectNews();

    expect(report.sources).toEqual([
      expect.objectContaining({ ok: true, found: 4, kept: 2, added: 2, error: null }),
    ]);
    const items = await db.newsItem.findMany({ orderBy: { publishedAt: "desc" } });
    expect(items.map((item) => item.matched)).toEqual(["язык вражды", "мошенничеств"]);
    expect(items[0]).toMatchObject({ source: "24.kg", lang: "ru", sourceId: source.id });

    const after = await db.newsSource.findUniqueOrThrow({ where: { id: source.id } });
    expect(after).toMatchObject({ lastStatus: "ok", lastFound: 4, lastKept: 2, lastError: null });
  });

  it("повторный обход обновляет, а не плодит копии", async () => {
    await db.newsSource.create({
      data: { name: "Kloop", feedUrl: "https://kloop.kg/atom", lang: "ru", takeAll: true },
    });
    const first = await collectNews();
    const second = await collectNews();
    expect(first.added).toBe(1);
    expect(second.added).toBe(0);
    expect(await db.newsItem.count()).toBe(1);
    expect((await db.newsItem.findFirstOrThrow()).matched).toBe("*");
  });

  it("упавшая лента не роняет остальные и пишет ошибку в свою строку", async () => {
    await db.newsSource.create({
      data: { name: "Down", feedUrl: "https://down.kg/rss", lang: "ru", takeAll: true },
    });
    await db.newsSource.create({
      data: { name: "Kloop", feedUrl: "https://kloop.kg/atom", lang: "ru", takeAll: true },
    });

    const report = await collectNews();
    expect(report.sources.map((item) => [item.name, item.ok, item.error])).toEqual([
      ["Down", false, "HTTP 503"],
      ["Kloop", true, null],
    ]);
    const down = await db.newsSource.findFirstOrThrow({ where: { name: "Down" } });
    expect(down).toMatchObject({ lastStatus: "error", lastError: "HTTP 503", lastFound: null });
  });

  it("без ключевых слов для языка говорит об этом, а не молчит", async () => {
    await db.newsSource.create({
      data: { name: "24.kg", feedUrl: "https://24.kg/rss", lang: "ky" },
    });
    const report = await collectNews();
    expect(report.sources[0].error).toBe("нет ключевых слов для языка «ky»");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("выключенный источник не обходит", async () => {
    await db.newsSource.create({
      data: { name: "Off", feedUrl: "https://24.kg/rss", lang: "ru", enabled: false, takeAll: true },
    });
    expect((await collectNews()).sources).toEqual([]);
  });

  it("заметки старше 60 дней не берёт", async () => {
    vi.setSystemTime(new Date("2027-03-01T00:00:00Z"));
    await db.newsSource.create({
      data: { name: "Kloop", feedUrl: "https://kloop.kg/atom", lang: "ru", takeAll: true },
    });
    const report = await collectNews();
    expect(report.sources[0]).toMatchObject({ ok: true, found: 1, kept: 0 });
    expect(await db.newsItem.count()).toBe(0);
  });
});
