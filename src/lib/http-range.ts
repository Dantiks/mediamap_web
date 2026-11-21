/*
  Заголовок Range.

  Браузер при перемотке видео и телефоны при любом воспроизведении просят
  кусок файла, а не весь; сервер, который всегда отвечает целиком и
  кодом 200, на iPhone просто не играет.
*/

/** Разбирает заголовок Range. null — его нет или он кривой: отдадим целиком. */
export function parseRange(
  header: string | null,
  size: number,
): { start: number; end: number } | null {
  const match = header?.match(/^bytes=(\d*)-(\d*)$/);
  if (!match) return null;

  const [, from, to] = match;
  if (!from && !to) return null;
  // «bytes=-500» — последние 500 байт, так тоже просят.
  const start = from ? Number.parseInt(from, 10) : Math.max(0, size - Number.parseInt(to, 10));
  const end = from && to ? Number.parseInt(to, 10) : size - 1;

  if (Number.isNaN(start) || Number.isNaN(end) || start > end || start >= size) return null;
  return { start, end: Math.min(end, size - 1) };
}
