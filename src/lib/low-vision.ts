// Версия для слабовидящих: какие настройки бывают и как они живут в куке.
//
// Кука, а не localStorage: сервер должен отдать страницу сразу крупной и
// контрастной. С localStorage человек на каждом переходе видел бы вспышку
// обычной мелкой страницы, пока скрипт не перекрасит её, — для того, кому
// и нужен этот режим, хуже не придумать.
//
// Применяется всё атрибутами на <html> (data-a11y-font="large" и т. д.), а
// стили под них переопределяют токены в globals.css. Разметку страниц
// трогать не нужно: она уже берёт цвета и размеры из токенов.
//
// Файл общий для сервера и браузера — без next/headers и прочего серверного.

export const LOW_VISION_COOKIE = "mm_a11y";

export const LOW_VISION_OPTIONS = {
  font: ["normal", "large", "xlarge"],
  /* light — чёрным по белому, dark — белым по чёрному. */
  scheme: ["normal", "light", "dark"],
  spacing: ["normal", "wide", "wider"],
  leading: ["normal", "loose", "looser"],
  images: ["on", "off"],
  motion: ["on", "off"],
} as const;

type Options = typeof LOW_VISION_OPTIONS;

export type LowVisionKey = keyof Options;

export type LowVision = { [K in LowVisionKey]: Options[K][number] };

export const LOW_VISION_KEYS = Object.keys(LOW_VISION_OPTIONS) as LowVisionKey[];

/** Первое значение в каждом списке — обычный сайт. */
export const LOW_VISION_DEFAULT = Object.fromEntries(
  LOW_VISION_KEYS.map((key) => [key, LOW_VISION_OPTIONS[key][0]]),
) as LowVision;

const isOption = <K extends LowVisionKey>(
  key: K,
  value: string,
): value is LowVision[K] =>
  (LOW_VISION_OPTIONS[key] as readonly string[]).includes(value);

/**
 * Кука → настройки. Вид: font:large|scheme:dark.
 *
 * Хранятся только отличия от обычного сайта. Всё незнакомое молча
 * пропускаем: кука могла остаться от старой версии, и падать из-за неё
 * страница не должна.
 */
export function parseLowVision(raw: string | undefined): LowVision {
  const result = { ...LOW_VISION_DEFAULT };
  if (!raw) return result;

  for (const pair of raw.split("|")) {
    const [key, value] = pair.split(":");
    if (key in LOW_VISION_OPTIONS && value) {
      const name = key as LowVisionKey;
      if (isOption(name, value)) (result as Record<string, string>)[name] = value;
    }
  }
  return result;
}

export function serializeLowVision(settings: LowVision): string {
  return LOW_VISION_KEYS.filter((key) => settings[key] !== LOW_VISION_DEFAULT[key])
    .map((key) => `${key}:${settings[key]}`)
    .join("|");
}

/**
 * Атрибуты для <html>. Обычные значения не пишем вовсе: стили завязаны
 * только на отличия, и чистый <html> у большинства посетителей проще
 * читать в отладке.
 */
export function lowVisionAttributes(settings: LowVision): Record<string, string> {
  return Object.fromEntries(
    LOW_VISION_KEYS.filter((key) => settings[key] !== LOW_VISION_DEFAULT[key]).map(
      (key) => [`data-a11y-${key}`, settings[key]],
    ),
  );
}
