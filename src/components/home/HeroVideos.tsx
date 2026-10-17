"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Play,
  Volume2,
  VolumeX,
} from "lucide-react";

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
  const [playing, setPlaying] = useState(false);
  /** Доля просмотренного, 0…1. Своя полоса перемотки держится на ней. */
  const [progress, setProgress] = useState(0);
  const player = useRef<HTMLVideoElement>(null);
  const track = useRef<HTMLDivElement>(null);

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

  const toggle = () => {
    const element = player.current;
    if (!element) return;
    if (element.paused) void element.play().catch(() => {});
    else element.pause();
  };

  /*
    Перемотка по своей полосе.

    Считаем долю от ширины дорожки и в неё же переводим время. Тянуть
    можно и за пределами полосы: палец на перемотке редко идёт ровно, а
    обрывать её на краю — значит ронять позицию на случайном кадре.
  */
  const seekTo = (clientX: number) => {
    const element = player.current;
    const line = track.current;
    if (!element || !line || !element.duration) return;

    const box = line.getBoundingClientRect();
    const share = Math.min(1, Math.max(0, (clientX - box.left) / box.width));
    element.currentTime = share * element.duration;
    setProgress(share);
  };

  const nudge = (seconds: number) => {
    const element = player.current;
    if (!element || !element.duration) return;
    element.currentTime = Math.min(
      element.duration,
      Math.max(0, element.currentTime + seconds),
    );
  };

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
            preload="metadata"
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onTimeUpdate={(event) => {
              const element = event.currentTarget;
              setProgress(
                element.duration ? element.currentTime / element.duration : 0,
              );
            }}
            onEnded={() => {
              setProgress(0);
              step(1);
            }}
            /* Рамка уже той же формы, что и кадр, поэтому contain ничего
               не обрежет, но подстрахует от роликов с неизвестными
               размерами: их мы считаем вертикальными. */
            className="h-full w-full object-contain"
          />

          {/*
            Нажатие по кадру — пуск и пауза, как в любой ленте. Это кнопка,
            а не слой с обработчиком: с клавиатуры до неё тоже надо
            добираться.
          */}
          <button
            type="button"
            onClick={toggle}
            className="absolute inset-0 flex items-center justify-center"
          >
            {/* Пока идёт — поверх кадра ничего не рисуем. Кружок с
                треугольником нужен ровно тогда, когда ролик стоит. */}
            {playing ? null : (
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-surface/90">
                <Play className="ml-0.5 h-6 w-6 text-ink" aria-hidden="true" />
              </span>
            )}
            <span className="sr-only">
              {playing ? words.videoPause : words.videoPlay}: {video.title}
            </span>
          </button>

          {/*
            Своя полоса перемотки вместо встроенного плеера.

            Встроенные элементы управления — чёрная панель во всю ширину с
            чужими иконками, и выглядит она как вставленный в страницу
            чужой проигрыватель. Здесь от плеера остаётся одна линия: она
            показывает, сколько осталось, и по ней же перематывают.

            Дорожка толще самой линии и не видна: попасть пальцем в две
            точки толщины невозможно, а в двенадцать — легко.
          */}
          <div
            ref={track}
            role="slider"
            tabIndex={0}
            aria-label={words.videoSeek}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress * 100)}
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              seekTo(event.clientX);
            }}
            onPointerMove={(event) => {
              if (event.buttons === 1) seekTo(event.clientX);
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowRight") nudge(5);
              else if (event.key === "ArrowLeft") nudge(-5);
              else if (event.key === " " || event.key === "Enter") toggle();
              else return;
              event.preventDefault();
            }}
            className="absolute inset-x-0 bottom-0 flex h-3 cursor-pointer touch-none items-end focus:outline-none"
          >
            <div className="h-[3px] w-full bg-surface/30">
              <div
                className="h-full bg-signal transition-[width] duration-150 ease-linear"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
          </div>

          {/* Кнопка звука — поверх кадра, в углу, подальше от полосы
              перемотки внизу. */}
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
