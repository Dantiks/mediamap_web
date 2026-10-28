/*
  Поиск цитат модели в разбираемом тексте — для подсветки.

  Модель возвращает приметы цитатами: «Срочно!», «переведите 5000 сом». Чтобы
  подсветить их в тексте, цитату надо в нём найти, а точного совпадения часто
  нет. Три причины, все живые:

    * модель цитирует с другим окончанием — по-кыргызски и по-русски слова
      склоняются, и «алдамчылыкка» в тексте стоит как «алдамчылык»;
    * цитата приходит с пояснением через тире: «Срочно!» — давление;
    * модель слегка перефразирует.

  Поэтому ищем в три захода: точное совпадение, затем совпадение с любым
  окончанием у каждого слова, и на этом останавливаемся. Не нашли — ничего
  не подсвечиваем: цитата останется в списке примет, а подсветить не то
  место хуже, чем не подсветить вовсе.
*/

export type Span = { start: number; end: number };

/** Отрезаем пояснение модели: всё после тире — её слова, не цитата. */
function quotedPart(marker: string): string {
  const quoted = /[«"„]([^»"“]{2,})[»"“]/.exec(marker);
  if (quoted) return quoted[1];

  // Без кавычек берём то, что до тире: «переведите 5000 сом - предоплата».
  return marker.split(/\s[—–-]\s/)[0] ?? marker;
}

const clean = (text: string) => text.replace(/\s+/g, " ").trim();

/** Экранируем для регулярного выражения. */
const safe = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Выражение, которое найдёт цитату с другими окончаниями.
 *
 * У слова длиннее четырёх букв отбрасываем две последние и разрешаем любое
 * продолжение: так «мошенничества» найдёт «мошенничеству». Короткие слова
 * оставляем как есть — у них отбрасывать нечего.
 */
function loosePattern(phrase: string): RegExp | null {
  const words = phrase.split(/\s+/).filter(Boolean);
  if (words.length === 0) return null;

  const parts = words.map((word) => {
    const bare = word.replace(/[^\p{L}\p{N}]/gu, "");
    if (bare.length < 5) return safe(word);
    return `${safe(bare.slice(0, -2))}\\p{L}*`;
  });

  return new RegExp(parts.join("[^\\p{L}\\p{N}]+"), "iu");
}

/**
 * Где в тексте стоят цитаты. Возвращает непересекающиеся отрезки по порядку.
 *
 * Пустой список — нормальный ответ: значит подсвечивать нечего.
 */
export function spansFor(text: string, markers: string[]): Span[] {
  if (!text || markers.length === 0) return [];

  const found: Span[] = [];

  for (const marker of markers) {
    const phrase = clean(quotedPart(marker));
    // Слишком короткая цитата подсветит пол-текста: «да», «он», «сом».
    if (phrase.length < 4) continue;

    const exact = text.toLowerCase().indexOf(phrase.toLowerCase());
    if (exact >= 0) {
      found.push({ start: exact, end: exact + phrase.length });
      continue;
    }

    const loose = loosePattern(phrase);
    const match = loose ? loose.exec(text) : null;
    if (match && match.index >= 0) {
      found.push({ start: match.index, end: match.index + match[0].length });
    }
  }

  return merge(found);
}

/** Склеивает пересечения: два совпадения на одном месте — одна подсветка. */
function merge(spans: Span[]): Span[] {
  const sorted = [...spans].sort((a, b) => a.start - b.start);
  const out: Span[] = [];

  for (const span of sorted) {
    const last = out.at(-1);
    if (last && span.start <= last.end) {
      last.end = Math.max(last.end, span.end);
      continue;
    }
    out.push({ ...span });
  }

  return out;
}

/** Текст, разбитый на куски: подсвечиваемые и обычные. */
export function pieces(
  text: string,
  markers: string[],
): { text: string; marked: boolean }[] {
  const spans = spansFor(text, markers);
  if (spans.length === 0) return [{ text, marked: false }];

  const out: { text: string; marked: boolean }[] = [];
  let at = 0;

  for (const span of spans) {
    if (span.start > at) out.push({ text: text.slice(at, span.start), marked: false });
    out.push({ text: text.slice(span.start, span.end), marked: true });
    at = span.end;
  }

  if (at < text.length) out.push({ text: text.slice(at), marked: false });
  return out;
}

/**
 * Нашлась ли в тексте хоть одна цитата.
 *
 * Нужна подписи под текстом: «подсвечено то, за что зацепилась модель» под
 * текстом без единой подсветки — обещание, которого страница не выполнила.
 * Так бывает штатно: приметы цитируют снимок, а под ними стоит пересказ
 * заявителя своими словами, и общих слов там может не оказаться вовсе.
 */
export const hasMarks = (text: string, markers: string[]): boolean =>
  spansFor(text, markers).length > 0;

/** Разбор сохранённого JSON с приметами. Кривую запись считаем пустой. */
export function markersOf(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}
