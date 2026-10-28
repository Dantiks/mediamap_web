import { pieces } from "@/lib/highlight";

/*
  Текст с подсвеченными цитатами модели.

  Подсветка — не украшение, а способ проверить вывод: видно, какие куски
  текста к нему привели. Поэтому <mark>, а не раскрашенный span: это
  смысловая разметка, и скринридер её объявляет.

  Если ни одна цитата не нашлась, текст выводится как есть — см.
  lib/highlight.ts, там же объяснено, почему не ищем приблизительно.
*/

type Props = {
  text: string;
  /** Цитаты модели. Пустой список — обычный текст. */
  markers: string[];
  className?: string;
};

export default function Marked({ text, markers, className }: Props) {
  const parts = pieces(text, markers);

  return (
    <p className={className}>
      {parts.map((part, index) =>
        part.marked ? (
          <mark key={index} className="bg-signal/15 text-ink">
            {part.text}
          </mark>
        ) : (
          <span key={index}>{part.text}</span>
        ),
      )}
    </p>
  );
}
