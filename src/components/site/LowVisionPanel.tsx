"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { RotateCcw, X } from "lucide-react";

import type { Dictionary } from "@/lib/i18n";
import {
  LOW_VISION_COOKIE,
  LOW_VISION_DEFAULT,
  LOW_VISION_KEYS,
  LOW_VISION_OPTIONS,
  lowVisionAttributes,
  parseLowVision,
  serializeLowVision,
  type LowVision,
  type LowVisionKey,
} from "@/lib/low-vision";

/*
  Панель версии для слабовидящих. Висит под шапкой во всю ширину, а не
  выпадающим списком у кнопки: настроек шесть, и в узком списке крупным
  шрифтом они уходили бы далеко за край экрана.

  Каждая настройка — группа обычных радиокнопок. Стрелки внутри группы,
  Tab между группами и чтение скринридером («Цвета, Белым по чёрному,
  выбрано, 3 из 3») браузер даёт сам, писать это руками незачем.

  Страницу не блокируем: человек должен видеть, как она меняется, пока он
  выбирает. Поэтому это не модальное окно, а панель, которая закрывается
  по Esc, крестику и клику мимо.
*/

type Props = {
  dict: Dictionary["lowVision"];
  onClose: () => void;
  /** Куда вернуть фокус, если кнопки, открывшей панель, уже нет:
      в телефонном меню она пропадает вместе с меню. */
  fallbackFocus: RefObject<HTMLElement | null>;
};

/** Текущие настройки — прямо с <html>: туда их положил сервер. */
function readFromPage(): LowVision {
  const root = document.documentElement;
  const raw = LOW_VISION_KEYS.map((key) => {
    const value = root.getAttribute(`data-a11y-${key}`);
    return value ? `${key}:${value}` : "";
  }).join("|");
  return parseLowVision(raw);
}

/** Атрибуты на <html> и кука. Без перезагрузки: стили срабатывают сразу. */
function apply(settings: LowVision) {
  const root = document.documentElement;
  const attributes = lowVisionAttributes(settings);
  for (const key of LOW_VISION_KEYS) {
    const name = `data-a11y-${key}`;
    if (attributes[name]) root.setAttribute(name, attributes[name]);
    else root.removeAttribute(name);
  }

  // Не httpOnly: пишет её браузер, а секретов в ней нет. Год — чтобы не
  // настраивать заново после каждого отпуска.
  const value = serializeLowVision(settings);
  document.cookie = value
    ? `${LOW_VISION_COOKIE}=${value}; path=/; max-age=31536000; samesite=lax`
    : `${LOW_VISION_COOKIE}=; path=/; max-age=0; samesite=lax`;
}

export default function LowVisionPanel({ dict, onClose, fallbackFocus }: Props) {
  const [settings, setSettings] = useState<LowVision>(readFromPage);
  const panelRef = useRef<HTMLDivElement>(null);

  /*
    Фокус при открытии — на саму панель, чтобы скринридер назвал её, а
    следующий Tab попал в первую настройку. При закрытии с клавиатуры
    фокус возвращается туда, откуда пришёл, иначе он падал в начало
    страницы и человек терял место.

    Откуда пришёл, запоминаем на первом рендере, а не в эффекте: эффект
    в режиме разработки срабатывает дважды, и во второй раз фокус уже
    стоит на самой панели — возвращать его было бы некуда.
  */
  const [opener] = useState(() => document.activeElement);

  const change = (next: LowVision) => {
    setSettings(next);
    apply(next);
  };

  useEffect(() => {
    panelRef.current?.focus();
  }, []);

  const closeAndReturn = () => {
    onClose();
    const target =
      opener instanceof HTMLElement && opener.isConnected && opener.offsetParent
        ? opener
        : fallbackFocus.current;
    target?.focus();
  };

  // Закрывать по Esc и по клику мимо. Мимо — это и не по кнопке, которая
  // её открывает: иначе панель закрывалась бы на mousedown и тут же
  // открывалась обратно на click.
  useEffect(() => {
    const outside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (panelRef.current?.contains(target)) return;
      if (target.closest?.("[data-low-vision-trigger]")) return;
      onClose();
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeAndReturn();
    };

    document.addEventListener("mousedown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", outside);
      document.removeEventListener("keydown", escape);
    };
  });

  const isDefault = serializeLowVision(settings) === "";

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-labelledby="low-vision-title"
      tabIndex={-1}
      // Высота ограничена экраном под шапкой: на телефоне очень крупным
      // шрифтом настройки длиннее экрана и прокручиваются внутри панели.
      className="absolute inset-x-0 top-full max-h-[calc(100dvh-4rem)] overflow-y-auto border-b border-line bg-paper shadow-sm focus:outline-none"
    >
      <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-10">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 id="low-vision-title" className="text-2xl">
              {dict.title}
            </h2>
            <p className="mt-1 text-sm text-muted">{dict.note}</p>
          </div>
          <button
            type="button"
            onClick={closeAndReturn}
            className="flex h-11 shrink-0 items-center gap-2 rounded-xs border border-border px-3 text-sm transition-colors hover:bg-surface"
          >
            <X className="h-4 w-4" aria-hidden="true" />
            {dict.close}
          </button>
        </div>

        <div className="mt-6 grid gap-x-10 gap-y-6 md:grid-cols-2 xl:grid-cols-3">
          {LOW_VISION_KEYS.map((key) => (
            <Group
              key={key}
              name={key}
              labels={dict[key]}
              value={settings[key]}
              // Значение пришло из того же списка вариантов, что и группа.
              onChange={(value) => change({ ...settings, [key]: value } as LowVision)}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={() => change(LOW_VISION_DEFAULT)}
          disabled={isDefault}
          className="mt-8 flex h-11 items-center gap-2 rounded-xs border border-border px-4 text-sm transition-colors hover:bg-surface disabled:opacity-60"
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          {dict.reset}
        </button>
      </div>
    </div>
  );
}

function Group({
  name,
  labels,
  value,
  onChange,
}: {
  name: LowVisionKey;
  labels: { label: string } & Record<string, string>;
  value: string;
  onChange: (value: string) => void;
}) {
  const options: readonly string[] = LOW_VISION_OPTIONS[name];

  return (
    <fieldset className="min-w-0">
      <legend className="text-sm font-medium">{labels.label}</legend>

      {/* Выбранное — залито, а не просто обведено: рамку другой толщины
          при плохом зрении не разглядеть. Сама радиокнопка спрятана, но
          остаётся в форме — фокус и стрелки работают на ней, а рамку
          фокуса рисуем на подписи. */}
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((option) => (
          <label
            key={option}
            className="flex min-h-11 cursor-pointer items-center rounded-xs border border-border px-3 py-2 text-sm transition-colors hover:bg-surface has-checked:border-ink has-checked:bg-ink has-checked:font-medium has-checked:text-surface has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-signal"
          >
            <input
              type="radio"
              name={`low-vision-${name}`}
              value={option}
              checked={value === option}
              onChange={() => onChange(option)}
              className="sr-only"
            />
            {labels[option]}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
