import { beforeEach, describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import { search } from "@/server/search-data";
import { makeReport, seedTypes, wipe } from "./db-helpers";

beforeEach(async () => {
  await wipe();
  await seedTypes();
  await makeReport({ status: "APPROVED", headline: "Травля журналистки в Бишкеке", city: "Бишкек" });
  await makeReport({ status: "PENDING", headline: "Непроверенное сообщение из Бишкека" });
  await makeReport({ status: "REJECTED", headline: "Отклонённое о Бишкеке" });
  await db.newsItem.create({
    data: {
      guid: "n1",
      title: "Суд в БИШКЕКЕ рассмотрел дело о фейке - Kaktus.media",
      link: "https://kaktus.media/1",
      source: "Google News",
      publishedAt: new Date(),
    },
  });
});

describe("search", () => {
  it("находит без учёта регистра кириллицы", async () => {
    const result = await search("бишкек", "ru");
    const cases = result.groups.find((group) => group.id === "cases");
    expect(cases?.hits.map((hit) => hit.title)).toEqual(["Травля журналистки в Бишкеке"]);
    expect(cases?.hits[0].href).toMatch(/^\/ru\/cases\/MM-/);

    const news = result.groups.find((group) => group.id === "news");
    expect(news?.hits[0]).toMatchObject({
      title: "Суд в БИШКЕКЕ рассмотрел дело о фейке",
      note: "Kaktus Media",
      external: true,
    });
  });

  it("непроверенные и отклонённые сообщения не находит", async () => {
    const result = await search("сообщение", "ru");
    expect(result.groups.find((group) => group.id === "cases")).toBeUndefined();
    expect((await search("Отклонённое", "ru")).groups.find((g) => g.id === "cases")).toBeUndefined();
  });

  it("находит виды нарушений и глоссарий из словаря", async () => {
    const result = await search("фейк", "ru");
    const ids = result.groups.map((group) => group.id);
    expect(ids).toContain("news");
    expect(result.total).toBe(result.groups.reduce((sum, group) => sum + group.hits.length, 0));
  });

  it("запрос короче двух знаков — пусто", async () => {
    expect(await search(" б ", "ru")).toEqual({ groups: [], total: 0 });
  });

  it("ссылки ведут на язык запроса", async () => {
    const result = await search("бишкек", "ky");
    expect(result.groups.find((group) => group.id === "cases")?.hits[0].href).toMatch(/^\/ky\//);
  });
});
