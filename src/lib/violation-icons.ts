/*
  Персонажи видов нарушений: метка на карте, фильтр и список под картой.
  У каждого вида своё лицо — вид различим и без цвета, и в схемах версии
  для слабовидящих, где цвета другие. Вариант 9 из эскизов на холсте.

  Злое лицо — язык вражды, лжец с длинным носом — дезинформация, лицо в
  маске — мошенничество, спокойное — всё остальное. Ключ — slug из базы.

  Сетка 44×42: голова — круг r16 с центром (20, 18), под ней хвостик к точке
  на карте (20, 41.5). Нос лжеца выходит за голову вправо, до x = 41.5.

  Части рисуются двумя цветами: `face` — цветом вида, `feature` — цветом
  карточки (белым, а в схеме «белым по чёрному» чёрным).
*/

export type FacePart =
  | { kind: "line"; d: string; width: number; paint: "face" | "feature" }
  | { kind: "shape"; d: string; paint: "face" | "feature" }
  | { kind: "dot"; cx: number; cy: number; rx: number; ry: number; paint: "face" | "feature" };

const eye = (cx: number, cy: number): FacePart => ({ kind: "dot", cx, cy, rx: 1.9, ry: 1.9, paint: "feature" });
const line = (d: string, width = 2): FacePart => ({ kind: "line", d, width, paint: "feature" });

const FACES: Record<string, readonly FacePart[]> = {
  "hate-speech": [
    line("M11.5 11.5l5.5 2.6M28.5 11.5L23 14.1", 2.2),
    eye(14.5, 17),
    eye(25.5, 17),
    line("M14 26.5c2.4-3 9.6-3 12 0", 2.2),
  ],
  disinformation: [
    eye(17.5, 15.5),
    eye(26.5, 15.5),
    line("M14.5 25.5c2.2 1.8 6.2 1.8 8.4 0"),
    { kind: "line", d: "M33 19.6H41.5", width: 4, paint: "face" },
    line("M24 19.6H33"),
  ],
  "digital-fraud": [
    {
      kind: "shape",
      d: "M5.5 15.5c4.2-2.2 24.8-2.2 29 0 0 3.3-1.7 5-4.4 5-2.2 0-3.3-1.7-4.4-1.7h-6.6c-1.1 0-2.2 1.7-4.4 1.7-2.7 0-4.4-1.7-4.4-5z",
      paint: "feature",
    },
    { kind: "dot", cx: 14, cy: 17, rx: 2.3, ry: 1.5, paint: "face" },
    { kind: "dot", cx: 26, cy: 17, rx: 2.3, ry: 1.5, paint: "face" },
    line("M14.5 26c3.5 1.6 7.5 1 11-1.8"),
  ],
};

const CALM: readonly FacePart[] = [eye(14.5, 16), eye(25.5, 16), line("M15 25.5h10")];

/** Черты лица для вида. Неизвестный вид получает спокойное лицо. */
export const typeFace = (slug: string): readonly FacePart[] => FACES[slug] ?? CALM;

export const HEAD = { cx: 20, cy: 18, r: 16 };
export const TAIL = "M16 31.5L20 41.5 24 31.5Z";

/** SVG-разметка черт — для метки Leaflet, которая собирается строкой. */
export function faceMarkup(slug: string, face: string, feature: string): string {
  const color = (paint: "face" | "feature") => (paint === "face" ? face : feature);
  return typeFace(slug)
    .map((part) => {
      if (part.kind === "dot")
        return `<ellipse cx="${part.cx}" cy="${part.cy}" rx="${part.rx}" ry="${part.ry}" fill="${color(part.paint)}"/>`;
      if (part.kind === "shape") return `<path d="${part.d}" fill="${color(part.paint)}"/>`;
      return `<path d="${part.d}" fill="none" stroke="${color(part.paint)}" stroke-width="${part.width}" stroke-linecap="round" stroke-linejoin="round"/>`;
    })
    .join("");
}
