import { beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "@/lib/db";
import { dropVideo, loadVideos } from "@/server/videos";
import { wipe } from "./db-helpers";

// Ролики с YouTube (подкасты Govori.TV) рядом со своими файлами.

vi.mock("@/server/storage", () => ({ put: vi.fn(), remove: vi.fn() }));

beforeEach(async () => {
  await wipe();
  await db.video.create({
    data: { title: "Свой ролик", lang: "ky", key: "a.mp4", mime: "video/mp4", size: 10, position: 0 },
  });
  await db.video.create({
    data: { title: "Подкаст", lang: "ky", youtubeId: "XH8XZ5aXjUA", width: 1280, height: 720, position: 1 },
  });
});

describe("loadVideos", () => {
  it("на странице «Видео» — и файлы, и YouTube", async () => {
    const rows = await loadVideos("ky");
    expect(rows.map((row) => [row.title, row.youtube, row.wide])).toEqual([
      ["Свой ролик", null, false],
      ["Подкаст", "XH8XZ5aXjUA", true],
    ]);
  });

  it("в карусель первого экрана — только свои файлы", async () => {
    const rows = await loadVideos("ky", 12, true);
    expect(rows.map((row) => row.title)).toEqual(["Свой ролик"]);
  });
});

describe("dropVideo", () => {
  it("у ролика с YouTube не трогает хранилище", async () => {
    const { remove } = await import("@/server/storage");
    const podcast = await db.video.findFirstOrThrow({ where: { youtubeId: { not: null } } });
    await dropVideo(podcast.id);
    expect(remove).not.toHaveBeenCalled();
    expect(await db.video.count()).toBe(1);
  });
});
