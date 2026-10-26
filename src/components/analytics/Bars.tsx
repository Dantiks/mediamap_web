import { typeColor } from "@/lib/violation-types";
import type { MonthPoint } from "@/server/public-analytics";

/*
  Столбики помесячной динамики для одного вида нарушений.

  Один график на вид, а не один общий со всеми сразу. В общем высоту
  столбика приходится читать вместе с цветом, и различать три близких
  оттенка глазами — работа. Здесь высота единственное, что нужно прочесть.

  Шкала приходит снаружи и у всех графиков одна: три одинаковые на вид
  картинки при разных числах — худшее, что может сделать такой раздел.

  Рисуем div'ами, без библиотеки графиков: тут нечего анимировать и не по
  чему водить мышью, а библиотека стоила бы сотни килобайт на странице,
  которую открывают раз в месяц.
*/

type Props = {
  slug: string;
  points: MonthPoint[];
  /** Общий потолок шкалы. */
  max: number;
  /** Подпись месяца — форматирует страница, она знает язык. */
  label: (month: Date) => string;
  /** Та же подпись одной буквой — для узкого графика. */
  narrowLabel: (month: Date) => string;
  /** Название столбика для тех, кто не видит картинку. */
  describe: (month: Date, total: number) => string;
};

/*
  Ширина графика — не ширина экрана.

  Двенадцать подписей «янв.», «февр.» требуют около 430 px. Раньше столбики
  не сжимались уже подписей, и на телефоне вся страница ездила вбок на
  386 px. Теперь у столбика min-w-0, а подписи выбираются по ширине самого
  графика (контейнерный запрос @md): узкий — «Я Ф М», широкий — «янв.
  февр. март». Ширина экрана тут не помогает: на компьютере графики стоят в
  три колонки и каждый так же узок, как на телефоне.

  Вторая половина той же поломки — колонка вокруг графика, см.
  analytics/page.tsx.
*/
export default function Bars({ slug, points, max, label, narrowLabel, describe }: Props) {
  return (
    <ol className="@container mt-4 flex h-32 items-end gap-1">
      {points.map((point) => (
        <li
          key={point.month.getTime()}
          className="flex h-full min-w-0 flex-1 flex-col justify-end"
          title={describe(point.month, point.total)}
        >
          {/* Нулевой месяц оставляет полоску в один пиксель: пустое место
              читается как «данных нет», а ноль — это данные. */}
          <span
            className={`w-full ${point.total > 0 ? typeColor(slug) : "bg-line"}`}
            style={{
              height: point.total > 0 ? `${(point.total / max) * 100}%` : "1px",
            }}
            aria-hidden="true"
          />
          <span className="sr-only">{describe(point.month, point.total)}</span>
          <span className="mt-1 block truncate text-center text-2xs text-muted @md:hidden">
            {narrowLabel(point.month)}
          </span>
          <span className="mt-1 hidden truncate text-center text-2xs text-muted @md:block">
            {label(point.month)}
          </span>
        </li>
      ))}
    </ol>
  );
}
