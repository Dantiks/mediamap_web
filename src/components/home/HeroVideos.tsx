"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, Volume2, VolumeX } from "lucide-react";

import type { Dictionary, Lang } from "@/lib/i18n";
import type { VideoRow } from "@/server/videos";

/*
  Карусель роликов на первом экране, справа от заголовка.

  Раньше здесь стоял список последних проверок. Решение проекта — показывать
  ролики: случаи и так идут ниже целым разделом, а ролик объясняет, как не
  попасться, быстрее любого текста.

  Звука нет и быть не может без спроса: браузеры сами запрещают автозапуск
  со звуком, да и страница о доверии не должна кричать на входящего. Зато
  включить звук можно одной кнопкой, и тогда он остаётся включённым при
  переходе к следующему ролику — человек уже сказал, чего хочет.

  Ролик листается сам, когда досмотрен до конца: это карусель, а не плеер
  с повтором. Руками листается стрелками и точками. Если в системе
  выключены анимации, сами ничего не запускаем — человек нажмёт.

  Грузим по одному: в DOM стоит только текущий ролик. Четыре видео разом
  на первом экране — это десятки мегабайт у того, кто зашёл прочитать
  заголовок.
*/

type Props = {
  dict: Dictionary;
  lang: Lang;
  videos: VideoRow[];
};

export default function HeroVideos({ dict, lang, videos }: Props) {
  const words = dict.home;
  const [current, setCurrent] = useState(0);
  const [muted, setMuted] = useState(true);
  const player = useRef<HTMLVideoElement>(null);

  const video = videos[current];

  /*
    Новый ролик запускаем сами: источник у элемента меняется, а браузер
    после смены src ничего не играет, пока не попросят. Отказ глотаем —
    автозапуск запрещён настройками, и это нормальное состояние, а не сбой.
  */
  useEffect(() => {
    const element = player.current;
    if (!element) return;

    const calm = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (calm) return;

    element.muted = muted;
    void element.play().catch(() => {});
  }, [current, muted]);

  if (!video) return null;

  const step = (delta: number) =>
    setCurrent((index) => (index + delta + videos.length) % videos.length);

  return (
    /*
      На телефоне карусели нет: первый экран там и так занят заголовком,
      кнопкой и числами, а полка роликов стоит ниже отдельным разделом.
    */
    <aside className="hidden border border-line bg-surface lg:block">
      <div className="flex items-baseline justify-between gap-4 border-b border-line px-6 py-4">
        <h2 className="eyebrow">{words.videoTitle}</h2>
        <Link
          href={`/${lang}/videos`}
          className="inline-flex items-center gap-1 text-sm text-signal hover:underline"
        >
          {words.videoAll}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      <div className="px-6 py-5">
        {/*
          Рамка повторяет форму самого ролика: горизонтальный идёт 16:9,
          вертикальный — 9:16.

          Сначала рамка у всех была вертикальной, как у рилса, а широкий
          ролик вписывался в неё целиком. Выходил кадр в половину ладони
          между двумя чёрными полями — ровно то, чего ждёшь от чужого
          плеера, а не от своего. Высота карточки теперь при переключении
          меняется, и это меньшее из двух зол: лучше прыжок на стыке
          роликов, чем постоянные поля вокруг каждого широкого.
        */}
        <div
          className={`relative mx-auto overflow-hidden rounded-xs bg-deep ${
            video.wide ? "aspect-video w-full" : "aspect-[9/16] max-h-[26rem]"
          }`}
        >
          <video
            ref={player}
            key={video.id}
            src={`/api/videos/${video.id}`}
            poster={video.hasPoster ? `/api/videos/${video.id}?poster` : undefined}
            muted={muted}
            playsInline
            controls
            preload="metadata"
            onEnded={() => step(1)}
            /* Рамка уже той же формы, что и кадр, поэтому contain ничего
               не обрежет, но подстрахует от роликов с неизвестными
               размерами: их мы считаем вертикальными. */
            className="h-full w-full object-contain"
          />

          {/* Кнопка звука — поверх кадра, в углу, подальше от стандартных
              элементов плеера внизу. */}
          <button
            type="button"
            onClick={() => setMuted((value) => !value)}
            aria-pressed={!muted}
            className="absolute top-3 right-3 flex h-10 w-10 items-center justify-center rounded-full bg-surface/85 text-ink transition-colors hover:bg-surface"
          >
            {muted ? (
              <VolumeX className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Volume2 className="h-5 w-5" aria-hidden="true" />
            )}
            <span className="sr-only">
              {muted ? words.videoSoundOn : words.videoSoundOff}
            </span>
          </button>
        </div>

        <p className="mt-4 line-clamp-2 text-base">{video.title}</p>

        {videos.length > 1 ? (
          <div className="mt-3 flex items-center justify-between gap-4">
            {/* Точки показывают, сколько роликов всего и который идёт.
                Они же — переключатели: по точке попасть проще, чем
                отлистывать стрелкой до нужного. */}
            <ol className="flex items-center gap-2">
              {videos.map((item, index) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setCurrent(index)}
                    aria-current={index === current ? "true" : undefined}
                    className={`block h-2 w-2 rounded-full transition-colors ${
                      index === current ? "bg-ink" : "bg-line hover:bg-muted"
                    }`}
                  >
                    <span className="sr-only">
                      {words.videoPlay}: {item.title}
                    </span>
                  </button>
                </li>
              ))}
            </ol>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => step(-1)}
                className="flex h-10 w-10 items-center justify-center rounded-xs border border-border transition-colors hover:bg-paper"
              >
                <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                <span className="sr-only">{words.videoPrev}</span>
              </button>
              <button
                type="button"
                onClick={() => step(1)}
                className="flex h-10 w-10 items-center justify-center rounded-xs border border-border transition-colors hover:bg-paper"
              >
                <ChevronRight className="h-5 w-5" aria-hidden="true" />
                <span className="sr-only">{words.videoNext}</span>
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
