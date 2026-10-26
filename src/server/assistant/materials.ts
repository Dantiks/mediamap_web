import { db } from "@/lib/db";
import { REPORT_STATUS } from "@/lib/enums";
import { decodeEntities, formatDate } from "@/lib/format";
import { getDictionary, violationText, type Lang } from "@/lib/i18n";
import { splitPublisher } from "@/server/news-data";

/*
  Что из базы показать модели вместе с вопросом.

  Ассистент не ищет сам: он видит только то, что мы подложили. Поэтому по
  вопросу подбираем несколько подтверждённых случаев и заметок дайджеста,
  и модель может на них сослаться — или честно сказать, что похожего нет.

  Подбор грубый, по совпадению основ слов. Поиск сайта тут не подходит: он
  ищет строку целиком, а вопрос «были ли случаи мошенничества с банками?»
  целиком не встретится нигде. Основа — первые пять букв: в русском и
  кыргызском слово меняет окончание, и «мошенничество» с «мошенников»
  иначе не сойдутся. Ошибается в обе стороны, и это не страшно: модель
  видит заголовки и сама отбрасывает лишнее.

  Наружу идут только опубликованные поля: заголовок случая, вид, город,
  дата, ссылка. Рассказ заявителя на сопоставление идёт, а в подсказку
  модели — нет: на странице случая он виден, но пересказывать его по
  первому вопросу незачем.
*/

const SCAN_LIMIT = 2000;
const TAKE = 5;
const STEM = 5;

/*
  Слова, которые есть почти в любом вопросе и ничего не ищут. Список
  короткий: длинные служебные слова отсекает длина основы, а прочий шум
  модель отбросит сама.
*/
const STOP = new Set(
  [
    // ru
    "котор", "когда", "сейча", "можно", "нужно", "будет", "какие", "какой",
    "какая", "сколь", "почем", "здрав", "скажи", "расск", "подск", "пожал",
    "сайте", "сайта", "media", "медиа", "случа", "новос", "инфор",
    // Слова о самом сайте есть почти в каждом вопросе и находят всё подряд.
    "наруш", "сообщ", "отпра", "форма", "прове",
    // ky
    "кандай", "канча", "эмнег", "айтып", "сураш", "салам", "болоб",
    "бузуу", "билди", "жөнөт", "текше",
    // en
    "about", "there", "which", "would", "could", "please", "where", "cases",
    "violation", "report", "submit", "check",
    "mediamap",
  ].map((word) => word.slice(0, STEM)),
);

const fold = (text: string) => text.toLowerCase().replace(/ё/g, "е");

/** Основы слов вопроса: длиннее четырёх букв, без служебных. */
export function stems(question: string): string[] {
  const words = fold(question).match(/[\p{L}\p{N}]{5,}/gu) ?? [];
  const unique = new Set(words.map((word) => word.slice(0, STEM)));
  return [...unique].filter((stem) => !STOP.has(stem)).slice(0, 12);
}

const score = (keys: string[], ...texts: (string | null | undefined)[]) => {
  const haystack = fold(texts.filter(Boolean).join(" "));
  return keys.reduce((sum, key) => sum + (haystack.includes(key) ? 1 : 0), 0);
};

export type Materials = { cases: string[]; news: string[] };

export async function findMaterials(question: string, lang: Lang): Promise<Materials> {
  const keys = stems(question);
  if (keys.length === 0) return { cases: [], news: [] };

  const dict = getDictionary(lang);

  const [reports, news] = await Promise.all([
    db.report.findMany({
      where: { status: REPORT_STATUS.APPROVED },
      select: {
        publicId: true,
        headline: true,
        city: true,
        authorComment: true,
        happenedAt: true,
        createdAt: true,
        violationType: { select: { slug: true } },
      },
      orderBy: { createdAt: "desc" },
      take: SCAN_LIMIT,
    }),
    db.newsItem.findMany({
      select: { title: true, snippet: true, link: true, source: true, publishedAt: true },
      orderBy: { publishedAt: "desc" },
      take: SCAN_LIMIT,
    }),
  ]);

  const cases = reports
    .map((row) => {
      const type = violationText(dict, row.violationType.slug)?.name ?? row.violationType.slug;
      return {
        row,
        type,
        score: score(keys, row.headline, row.city, row.authorComment, type),
      };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, TAKE)
    .map(({ row, type }) =>
      [
        row.headline,
        type,
        row.city,
        formatDate(row.happenedAt ?? row.createdAt, lang),
        `/${lang}/cases/${row.publicId}`,
      ]
        .filter(Boolean)
        .join(" | "),
    );

  const digest = news
    .map((row) => ({ row, score: score(keys, row.title, row.snippet) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, TAKE)
    .map(({ row }) => {
      const { title, publisher } = splitPublisher(decodeEntities(row.title));
      return [title, publisher ?? row.source, formatDate(row.publishedAt, lang), row.link].join(
        " | ",
      );
    });

  return { cases, news: digest };
}
