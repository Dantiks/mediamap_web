import { READY_LANGUAGES, type Lang } from "./i18n/languages";

/*
  Правила раздела фонда «Медиа Консалт»: какие файлы принимаем, как
  хранятся тексты на нескольких языках, как выглядит адрес проекта.

  Здесь только чистые функции без базы и диска — их можно проверить
  тестом и подключить и на сервере, и в браузере.
*/

export const FUND_KIND = {
  IMAGE: "IMAGE",
  VIDEO: "VIDEO",
  DOCUMENT: "DOCUMENT",
} as const;

export type FundKind = (typeof FUND_KIND)[keyof typeof FUND_KIND];

/*
  Белый список по расширению.

  У присланных браузером типов слишком много разночтений: .docx с одного
  компьютера приходит как application/vnd.openxmlformats-…, с другого как
  application/octet-stream. Поэтому тип выводим сами из расширения и с
  ним же файл раздаём.

  Чего здесь нет намеренно: программ (.exe, .msi, .apk, .dmg, скрипты) —
  раздавать их посетителям от имени фонда нельзя; HTML и SVG — браузер
  исполнит их скрипты на нашем домене.
*/
type Rule = { kind: FundKind; mime: string };

const RULES: Record<string, Rule> = {
  // Фотографии. HEIC приходит с айфона; браузеры, кроме Safari, его не
  // показывают, поэтому для галереи сервер переводит его в JPEG.
  jpg: { kind: FUND_KIND.IMAGE, mime: "image/jpeg" },
  jpeg: { kind: FUND_KIND.IMAGE, mime: "image/jpeg" },
  png: { kind: FUND_KIND.IMAGE, mime: "image/png" },
  webp: { kind: FUND_KIND.IMAGE, mime: "image/webp" },
  gif: { kind: FUND_KIND.IMAGE, mime: "image/gif" },
  heic: { kind: FUND_KIND.IMAGE, mime: "image/heic" },
  heif: { kind: FUND_KIND.IMAGE, mime: "image/heif" },

  mp4: { kind: FUND_KIND.VIDEO, mime: "video/mp4" },
  mov: { kind: FUND_KIND.VIDEO, mime: "video/quicktime" },
  m4v: { kind: FUND_KIND.VIDEO, mime: "video/mp4" },
  webm: { kind: FUND_KIND.VIDEO, mime: "video/webm" },

  pdf: { kind: FUND_KIND.DOCUMENT, mime: "application/pdf" },
  doc: { kind: FUND_KIND.DOCUMENT, mime: "application/msword" },
  docx: {
    kind: FUND_KIND.DOCUMENT,
    mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  },
  xls: { kind: FUND_KIND.DOCUMENT, mime: "application/vnd.ms-excel" },
  xlsx: {
    kind: FUND_KIND.DOCUMENT,
    mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  },
  ppt: { kind: FUND_KIND.DOCUMENT, mime: "application/vnd.ms-powerpoint" },
  pptx: {
    kind: FUND_KIND.DOCUMENT,
    mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  },
  odt: { kind: FUND_KIND.DOCUMENT, mime: "application/vnd.oasis.opendocument.text" },
  ods: { kind: FUND_KIND.DOCUMENT, mime: "application/vnd.oasis.opendocument.spreadsheet" },
  odp: { kind: FUND_KIND.DOCUMENT, mime: "application/vnd.oasis.opendocument.presentation" },
  rtf: { kind: FUND_KIND.DOCUMENT, mime: "application/rtf" },
  txt: { kind: FUND_KIND.DOCUMENT, mime: "text/plain; charset=utf-8" },
  csv: { kind: FUND_KIND.DOCUMENT, mime: "text/csv; charset=utf-8" },
  zip: { kind: FUND_KIND.DOCUMENT, mime: "application/zip" },
  rar: { kind: FUND_KIND.DOCUMENT, mime: "application/vnd.rar" },
  "7z": { kind: FUND_KIND.DOCUMENT, mime: "application/x-7z-compressed" },
  mp3: { kind: FUND_KIND.DOCUMENT, mime: "audio/mpeg" },
  m4a: { kind: FUND_KIND.DOCUMENT, mime: "audio/mp4" },
  wav: { kind: FUND_KIND.DOCUMENT, mime: "audio/wav" },
};

/** Потолок одного файла. Обещан фонду: документы, фото и видео до 100 МБ. */
export const FUND_MAX_BYTES = 100 * 1024 * 1024;

/*
  Кусок загрузки. Сервер за Caddy принимает запрос до 60 МБ, поэтому
  большой файл едет частями — заодно в форме видно, сколько уже ушло.
*/
export const FUND_CHUNK_BYTES = 8 * 1024 * 1024;

/** Для поля выбора файла: «.jpg,.png,…». */
export const FUND_ACCEPT = Object.keys(RULES)
  .map((ext) => `.${ext}`)
  .join(",");

/** Расширение из имени файла, в нижнем регистре. Пусто — расширения нет. */
export const extensionOf = (name: string): string => {
  const match = /\.([a-z0-9]{1,5})$/i.exec(name.trim());
  return match ? match[1].toLowerCase() : "";
};

/** Правило для файла с таким именем. null — такой файл не принимаем. */
export const fundRuleFor = (name: string): (Rule & { ext: string }) | null => {
  const ext = extensionOf(name);
  const rule = RULES[ext];
  return rule ? { ...rule, ext } : null;
};

export const isFundKind = (value: string): value is FundKind =>
  Object.values(FUND_KIND).includes(value as FundKind);

/*
  Тексты на нескольких языках.

  Хранятся объектом {"ru": "…", "ky": "…"}. Русский обязателен; на языке,
  который не заполнили, показываем русский и говорим об этом.
*/
export type Localized = Partial<Record<string, string>>;

/** Язык, на котором текст обязателен и к которому откатываемся. */
export const FUND_BASE_LANG: Lang = "ru";

/** Языки, у которых в панели свои поля. Это языки готовых версий сайта. */
export const FUND_LANGS: readonly Lang[] = [
  FUND_BASE_LANG,
  ...READY_LANGUAGES.filter((lang) => lang !== FUND_BASE_LANG),
];

/** Разбор из базы. Битая или чужая строка — пустой объект, а не падение страницы. */
export function parseLocalized(raw: string | null | undefined): Localized {
  if (!raw) return {};
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    const out: Localized = {};
    for (const [lang, text] of Object.entries(value)) {
      if (typeof text === "string" && text.trim()) out[lang] = text.trim();
    }
    return out;
  } catch {
    return {};
  }
}

/** Собирает объект из полей формы name_ru, name_ky… Пустые не сохраняем. */
export function localizedFromForm(form: FormData, field: string): Localized {
  const out: Localized = {};
  for (const lang of FUND_LANGS) {
    const text = String(form.get(`${field}_${lang}`) ?? "").trim();
    if (text) out[lang] = text;
  }
  return out;
}

export type Picked = {
  text: string;
  /** Язык, на котором текст на самом деле. Не совпал с языком страницы — подписываем. */
  lang: string;
};

/**
 * Текст для страницы на языке `lang`.
 *
 * Сначала свой язык, потом русский, потом любой заполненный: проект,
 * заведённый только по-кыргызски, лучше показать по-кыргызски, чем пустым.
 */
export function pick(value: Localized, lang: string): Picked | null {
  if (value[lang]) return { text: value[lang]!, lang };
  if (value[FUND_BASE_LANG]) return { text: value[FUND_BASE_LANG]!, lang: FUND_BASE_LANG };
  const first = Object.entries(value).find(([, text]) => text);
  return first ? { text: first[1]!, lang: first[0] } : null;
}

/** Абзацы: разделены пустой строкой. Одиночный перенос остаётся переносом. */
export const paragraphs = (text: string): string[] =>
  text
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean);

/*
  Ссылки проекта и контактов.

  В панели это текстовое поле: по ссылке на строку, подпись через пробел
  после адреса — «https://youtu.be/… Видео с тренинга». Так проще, чем
  форма с кнопкой «добавить ещё», и вставляется списком из отчёта.
*/
export type FundLink = { url: string; label: string };

export function linksFromText(text: string): FundLink[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [url, ...rest] = line.split(/\s+/);
      return { url, label: rest.join(" ").trim() };
    })
    // Только http и https: javascript: в ссылке на нашей странице —
    // это скрипт, который мы сами подсунули посетителю.
    .filter((link) => /^https?:\/\/[^\s]+$/i.test(link.url))
    .slice(0, 30);
}

export const linksToText = (links: FundLink[]): string =>
  links.map((link) => (link.label ? `${link.url} ${link.label}` : link.url)).join("\n");

export function parseLinks(raw: string | null | undefined): FundLink[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return value.filter(
      (item): item is FundLink =>
        !!item &&
        typeof item.url === "string" &&
        typeof item.label === "string" &&
        /^https?:\/\//i.test(item.url),
    );
  } catch {
    return [];
  }
}

/** Подпись ссылки без подписи: домен, а не весь адрес с хвостом из меток. */
export function linkLabel(link: FundLink): string {
  if (link.label) return link.label;
  try {
    return new URL(link.url).hostname.replace(/^www\./, "");
  } catch {
    return link.url;
  }
}

/*
  Адрес проекта: /media-consult/12-trening-dlya-zhurnalistov.

  Номер впереди решает, какой это проект, хвост из названия — для людей и
  поиска. Переименовали проект — старые ссылки продолжают работать: по
  ним находится тот же номер, а страница отправит на новый адрес.
*/
const TRANSLIT: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z",
  и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r",
  с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "ts", ч: "ch", ш: "sh",
  щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya", ө: "o", ү: "u",
  ң: "n", қ: "k", ғ: "g", ә: "a", һ: "h", і: "i", ұ: "u",
};

export function projectSlug(id: number, title: string): string {
  const tail = title
    .toLowerCase()
    .split("")
    .map((char) => TRANSLIT[char] ?? char)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/, "");
  return tail ? `${id}-${tail}` : String(id);
}

/** Номер проекта из адреса. null — адрес не наш. */
export function projectIdFrom(slug: string): number | null {
  const match = /^(\d{1,9})(?:-|$)/.exec(slug);
  return match ? Number(match[1]) : null;
}

/** Размер для людей: «3,4 МБ», «820 КБ». */
export function humanSize(bytes: number, lang: string): string {
  const units = lang === "en" ? ["KB", "MB"] : ["КБ", "МБ"];
  const format = (value: number) =>
    new Intl.NumberFormat(lang, { maximumFractionDigits: 1 }).format(value);
  if (bytes < 1024 * 1024) return `${format(Math.max(1, bytes / 1024))} ${units[0]}`;
  return `${format(bytes / 1024 / 1024)} ${units[1]}`;
}
