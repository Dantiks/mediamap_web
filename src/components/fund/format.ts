import type { Picked } from "@/lib/fund-rules";

/*
  Подписи страниц фонда: сроки проекта и пометка о языке текста.
*/

/** «март 2025 — июнь 2025», «с марта 2025», «Идёт сейчас». */
export function projectDates(
  project: { startDate: Date | null; endDate: Date | null; ongoing: boolean },
  lang: string,
  ongoingLabel: string,
): string | null {
  const month = new Intl.DateTimeFormat(lang, { month: "long", year: "numeric", timeZone: "UTC" });
  const from = project.startDate ? month.format(project.startDate) : null;
  const to = project.endDate ? month.format(project.endDate) : null;

  if (project.ongoing) return from ? `${from} — ${ongoingLabel.toLowerCase()}` : ongoingLabel;
  if (from && to) return from === to ? from : `${from} — ${to}`;
  return from ?? to;
}

/** Пометка «на русском», если текст не на языке страницы. */
export function langNote(
  picked: Picked | null | undefined,
  lang: string,
  names: Record<string, string>,
): string | null {
  if (!picked || picked.lang === lang) return null;
  return names[picked.lang] ?? picked.lang;
}
