import { afterEach, describe, expect, it, vi } from "vitest";

import {
  itemFromHead,
  newestPostSitemap,
  parseSitemap,
  sitemapItems,
  sitemapSince,
} from "@/server/news-sitemap";
import { RSS } from "../fixtures/feeds";

// Карта сайта вместо ленты — так собирается Govori.TV, у которого RSS выключен.

const INDEX = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>https://govori.tv/post-sitemap79.xml</loc><lastmod>2026-09-01T10:00:00+00:00</lastmod></sitemap>
  <sitemap><loc>https://govori.tv/post-sitemap80.xml</loc><lastmod>2026-10-29T09:25:58+00:00</lastmod></sitemap>
  <sitemap><loc>https://govori.tv/page-sitemap.xml</loc><lastmod>2026-10-01T00:00:00+00:00</lastmod></sitemap>
  <sitemap><loc>https://govori.tv/post_tag-sitemap34.xml</loc><lastmod>2026-10-29T09:25:58+00:00</lastmod></sitemap>
</sitemapindex>`;

const PAGES = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://govori.tv/old/</loc><lastmod>2026-09-04T16:52:16+00:00</lastmod></url>
  <url><loc>https://govori.tv/fresh/</loc><lastmod>2026-10-29T08:57:10+00:00</lastmod></url>
  <url><loc>https://govori.tv/fresher/</loc><lastmod>2026-10-29T10:41:00+00:00</lastmod></url>
</urlset>`;

const HEAD = `<html><head>
<meta name="description" content="Ачык айтып, ак сүйлө!">
<meta property="og:title" content="Кыргызстанга Казакстандын премьер-министри келди &#8212; Кыргызстандын жаңылыктары Govori.TV" />
<meta property="og:description" content="Кыргызстандын жаңылыктары Govori.TV &#8212; Кыргызстанга Казакстандын премьер-министри келди" />
<meta property="og:site_name" content="Кыргызстандын жаңылыктары Govori.TV" />
<meta property="article:published_time" content="2026-10-29T08:57:10+00:00" />
<meta property="og:image" content="/wp-content/uploads/2026/10/photo.jpeg" />
</head>`;

describe("parseSitemap", () => {
  it("отличает оглавление от карты страниц", () => {
    expect(parseSitemap(INDEX)?.kind).toBe("index");
    expect(parseSitemap(PAGES)?.kind).toBe("pages");
    expect(parseSitemap(PAGES)?.entries[1]).toEqual({
      loc: "https://govori.tv/fresh/",
      lastmod: new Date("2026-10-29T08:57:10Z"),
    });
  });

  it("RSS картой сайта не считает", () => {
    expect(parseSitemap(RSS)).toBeNull();
  });
});

describe("newestPostSitemap", () => {
  it("берёт свежую карту заметок, а не меток с той же датой", () => {
    const entries = parseSitemap(INDEX)!.entries;
    expect(newestPostSitemap(entries)).toBe("https://govori.tv/post-sitemap80.xml");
  });
});

describe("itemFromHead", () => {
  const item = itemFromHead(HEAD, "https://govori.tv/fresh/", null)!;

  it("убирает из заголовка название сайта", () => {
    expect(item.title).toBe("Кыргызстанга Казакстандын премьер-министри келди");
  });

  it("описание-повтор заголовка лидом не считает", () => {
    expect(item.snippet).toBeNull();
  });

  it("дата — из article:published_time, картинка — с доменом", () => {
    expect(item.publishedAt).toEqual(new Date("2026-10-29T08:57:10Z"));
    expect(item.image).toBe("https://govori.tv/wp-content/uploads/2026/10/photo.jpeg");
    expect(item.guid).toBe("https://govori.tv/fresh/");
  });

  it("без заголовка заметки нет", () => {
    expect(itemFromHead("<head></head>", "https://govori.tv/x/", null)).toBeNull();
  });
});

describe("sitemapItems", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("открывает только правленное после since, свежие первыми", async () => {
    const opened: string[] = [];
    vi.stubGlobal("fetch", async (url: string) => {
      opened.push(url);
      return new Response(HEAD);
    });
    const fetchXml = async (url: string) => {
      expect(url).toBe("https://govori.tv/post-sitemap80.xml");
      return PAGES;
    };

    const items = await sitemapItems(
      parseSitemap(INDEX)!,
      new Date("2026-10-29T00:00:00Z"),
      fetchXml,
    );

    expect(opened).toEqual(["https://govori.tv/fresher/", "https://govori.tv/fresh/"]);
    expect(items.map((item) => item.link)).toEqual(opened);
  });

  it("карта без дат правки — ошибка, видная в панели", async () => {
    const bare = parseSitemap(
      `<urlset><url><loc>https://a.kg/1/</loc></url></urlset>`,
    )!;
    await expect(sitemapItems(bare, new Date(0), async () => "")).rejects.toThrow(
      "lastmod",
    );
  });
});

describe("sitemapSince", () => {
  const oldest = new Date("2026-09-01T00:00:00Z");

  it("после удачного обхода — с часом запаса", () => {
    const lastRunAt = new Date("2026-10-29T10:00:00Z");
    expect(sitemapSince({ lastRunAt, lastStatus: "ok" }, oldest)).toEqual(
      new Date("2026-10-29T09:00:00Z"),
    );
  });

  it("после сбоя или в первый раз — за весь срок", () => {
    const lastRunAt = new Date("2026-10-29T10:00:00Z");
    expect(sitemapSince({ lastRunAt, lastStatus: "error" }, oldest)).toBe(oldest);
    expect(sitemapSince({ lastRunAt: null, lastStatus: null }, oldest)).toBe(oldest);
  });
});
