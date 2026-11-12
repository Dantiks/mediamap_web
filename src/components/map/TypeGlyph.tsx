import { typeGlyph } from "@/lib/violation-icons";

// Значок вида в квадрате его цвета — для фильтра и списка под картой.
// Цвет квадрата задаёт класс снаружи (typeColor), значок рисуется цветом
// карточки: в схеме «белым по чёрному» он становится чёрным на светлом.

export default function TypeGlyph({ slug, className }: { slug: string; className: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-xs text-surface ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-3.5 w-3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {typeGlyph(slug).map((d) => (
          <path key={d} d={d} />
        ))}
      </svg>
    </span>
  );
}
