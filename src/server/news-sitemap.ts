import { XMLParser } from "fast-xml-parser";

import { decodeEntities } from "@/lib/format";
import type { FeedItem } from "./news-collect";
import { imageFromHead, meta, pageHead } from "./news-image";

/*
  Источник без ленты: карта сайта (sitemap.xml).

  Появилось ради Govori.TV — живого кыргызоязычного издания, у которого
  RSS выключен: /feed/ отдаёт главную страницу, REST API закрыт, а Google
  News знает два их материала за два месяца. Карта сайта при этом честная —
  каждая заметка с датой правки, и обновляется она вместе с сайтом.

  В карте нет заголовков, только адреса. Поэтому заголовок, дату и картинку
  берём со страницы самой заметки, из разметки для соцсетей (og:title,
  article:published_time, og:image). Это запрос на заметку, и чтобы не
  ходить по сотням страниц каждый час:

    — смотрим только то, что правилось после прошлого удачного обхода
      (с часом запаса), а в первый раз — за тот же срок, что и у лент;
    — за один обход открываем не больше MAX_PAGES_PER_RUN страниц,
      самые свежие.

  Отличать карту от ленты администратору не нужно: в панель вводится адрес,
  а что за ним лежит, сборщик видит по корневому тегу.
*/

/** Сколько страниц заметок открывать за один обход одного источника. */
const MAX_PAGES_PER_RUN = 30;

/** Запас к времени прошлого обхода: дата правки в карте бывает с опозданием. */
const OVERLAP_MS = 60 * 60 * 1000;

export type SitemapEntry = { loc: string; lastmod: Date | null };

export type Sitemap = {
  /** index — оглавление из других карт, pages — сами адреса страниц. */
  kind: "index" | "pages";
  entries: SitemapEntry[];
};

const parser = new XMLParser({ parseTagValue: false, trimValues: true });

const str = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value.trim() : null;

function date(value: unknown): Date | null {
  const raw = str(value);
  if (!raw) return null;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** Карта сайта или null, если это не она (а, например, RSS). */
export function parseSitemap(xml: string): Sitemap | null {
  const tree = parser.parse(xml) as Record<string, Record<string, unknown> | undefined>;
  const kind = tree.sitemapindex ? "index" : tree.urlset ? "pages" : null;
  if (!kind) return null;

  const raw = (kind === "index" ? tree.sitemapindex?.sitemap : tree.urlset?.url) ?? [];
  const nodes = (Array.isArray(raw) ? raw : [raw]) as Record<string, unknown>[];

  const entries: SitemapEntry[] = [];
  for (const node of nodes) {
    const loc = node && typeof node === "object" ? str(node.loc) : null;
    if (loc) entries.push({ loc, lastmod: date(node.lastmod) });
  }
  return { kind, entries };
}

const time = (entry: SitemapEntry) => entry.lastmod?.getTime() ?? 0;

/*
  Из оглавления берём карту заметок с самой свежей правкой.

  WordPress с Yoast делит заметки на post-sitemap1…80, и свежие лежат в
  последней. Рядом в оглавлении — карты меток, рубрик и авторов, у которых
  дата правки тоже свежая; их отсекаем по имени. При равных датах берём
  стоящую ниже: нумерация идёт от старых к новым.
*/
export function newestPostSitemap(entries: SitemapEntry[]): string | null {
  const posts = entries.filter(
    (entry) =>
      /post|news|article/i.test(entry.loc) && !/tag|categor|author/i.test(entry.loc),
  );
  let best: SitemapEntry | null = null;
  for (const entry of posts.length ? posts : entries) {
    if (!best || time(entry) >= time(best)) best = entry;
  }
  return best?.loc ?? null;
}

/** Убирает из заголовка название сайта: «Заголовок — Govori.TV». */
function withoutSite(title: string, site: string | null): string {
  if (!site) return title;
  for (const separator of [" — ", " – ", " | ", " - "]) {
    if (title.endsWith(separator + site)) {
      return title.slice(0, -(separator + site).length).trim();
    }
    if (title.startsWith(site + separator)) {
      return title.slice((site + separator).length).trim();
    }
  }
  return title;
}

/** Заметка по голове её страницы. null — заголовка на странице нет. */
export function itemFromHead(
  head: string,
  url: string,
  lastmod: Date | null,
): FeedItem | null {
  const site = meta(head, "og:site_name");
  const tag = /<title[^>]*>([^<]+)<\/title>/i.exec(head)?.[1]?.trim();
  const raw =
    meta(head, "og:title") ??
    meta(head, "twitter:title") ??
    (tag ? decodeEntities(tag) : null);
  if (!raw) return null;
  const title = withoutSite(raw, site);

  /*
    Описание у части сайтов — не лид, а «Название сайта — заголовок».
    Для отбора по словам оно ничего не добавляет, а в дайджесте выглядело
    бы повтором; такое не берём.
  */
  const description = meta(head, "og:description") ?? meta(head, "description");
  const snippet = description && !description.includes(title) ? description : null;

  return {
    guid: url,
    title,
    link: url,
    snippet,
    publishedAt: date(meta(head, "article:published_time")) ?? lastmod ?? new Date(),
    image: imageFromHead(head, url),
  };
}

/**
 * Свежие заметки по карте сайта.
 *
 * since — с какого момента правки нас интересуют. fetchXml — тот же загрузчик,
 * что у лент: с теми же ограничениями по времени и размеру.
 */
export async function sitemapItems(
  sitemap: Sitemap,
  since: Date,
  fetchXml: (url: string) => Promise<string>,
): Promise<FeedItem[]> {
  let pages = sitemap;
  if (sitemap.kind === "index") {
    const child = newestPostSitemap(sitemap.entries);
    if (!child) return [];
    const parsed = parseSitemap(await fetchXml(child));
    if (parsed?.kind !== "pages") {
      throw new Error("в оглавлении карты сайта не нашлось карты заметок");
    }
    pages = parsed;
  }

  // Без дат правки не понять, что нового, — пришлось бы каждый час
  // открывать сотни страниц. Говорим об этом в панели, а не молчим.
  if (pages.entries.length > 0 && pages.entries.every((entry) => !entry.lastmod)) {
    throw new Error("в карте сайта нет дат правки (lastmod)");
  }

  const fresh = pages.entries
    .filter((entry) => entry.lastmod && entry.lastmod >= since)
    .sort((a, b) => time(b) - time(a))
    .slice(0, MAX_PAGES_PER_RUN);

  const items: FeedItem[] = [];
  // По одной, а не пачкой: это чужой сайт, и тридцать запросов разом
  // от бота дайджеста ему ни к чему.
  for (const entry of fresh) {
    const head = await pageHead(entry.loc);
    const item = head ? itemFromHead(head, entry.loc, entry.lastmod) : null;
    if (item) items.push(item);
  }
  return items;
}

/** С какого момента смотреть карту: после прошлого удачного обхода. */
export function sitemapSince(
  source: { lastRunAt: Date | null; lastStatus: string | null },
  oldest: Date,
): Date {
  if (source.lastStatus !== "ok" || !source.lastRunAt) return oldest;
  const after = new Date(source.lastRunAt.getTime() - OVERLAP_MS);
  return after > oldest ? after : oldest;
}
