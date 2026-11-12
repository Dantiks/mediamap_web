import { HEAD, typeFace } from "@/lib/violation-icons";

// Лицо вида без хвостика — для фильтра и списка под картой. Голова цвета
// вида (класс fill-* снаружи), черты цветом карточки: в схеме «белым по
// чёрному» они становятся чёрными на светлом. Рамка шире головы, чтобы
// влез нос лжеца.

export default function TypeGlyph({ slug, className }: { slug: string; className: string }) {
  return (
    <svg aria-hidden="true" viewBox="3 1 39.5 34" className={`h-5 w-6 shrink-0 ${className}`}>
      <circle cx={HEAD.cx} cy={HEAD.cy} r={HEAD.r} fill="currentColor" />
      {typeFace(slug).map((part, index) => {
        const paint = part.paint === "face" ? "currentColor" : "var(--color-surface)";
        if (part.kind === "dot")
          return <ellipse key={index} cx={part.cx} cy={part.cy} rx={part.rx} ry={part.ry} fill={paint} />;
        if (part.kind === "shape") return <path key={index} d={part.d} fill={paint} />;
        return (
          <path
            key={index}
            d={part.d}
            fill="none"
            stroke={paint}
            strokeWidth={part.width}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        );
      })}
    </svg>
  );
}
