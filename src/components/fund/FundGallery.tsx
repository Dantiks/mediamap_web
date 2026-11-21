"use client";

import { ChevronLeft, ChevronRight, Download, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

/*
  Фотографии проекта: сетка миниатюр и просмотр на весь экран.

  Просмотр — на <dialog>: браузер сам держит фокус внутри, закрывает по
  Escape и прячет страницу от экранного диктора. Стрелками на клавиатуре
  и кнопками по краям листаются соседние фото, свайп на телефоне тоже.
*/

export type GalleryPhoto = {
  id: string;
  thumb: string;
  preview: string;
  url: string;
  caption: string | null;
  name: string;
  width: number | null;
  height: number | null;
};

type Words = {
  openPhoto: string;
  close: string;
  previous: string;
  next: string;
  download: string;
  photoOf: string;
};

export default function FundGallery({ photos, words }: { photos: GalleryPhoto[]; words: Words }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState<number | null>(null);
  const touch = useRef<number | null>(null);

  const show = (index: number) => {
    setOpen(index);
    dialog.current?.showModal();
  };

  const step = useCallback(
    (delta: number) =>
      setOpen((index) => (index === null ? null : (index + delta + photos.length) % photos.length)),
    [photos.length],
  );

  useEffect(() => {
    if (open === null) return;
    const keys = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") step(1);
      if (event.key === "ArrowLeft") step(-1);
    };
    document.addEventListener("keydown", keys);
    return () => document.removeEventListener("keydown", keys);
  }, [open, step]);

  const current = open === null ? null : photos[open];

  return (
    <>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {photos.map((photo, index) => (
          <li key={photo.id}>
            <button
              type="button"
              onClick={() => show(index)}
              className="group block w-full overflow-hidden rounded-xs bg-paper text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fund"
              aria-label={`${words.openPhoto}: ${photo.caption ?? photo.name}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.thumb}
                alt={photo.caption ?? ""}
                loading="lazy"
                className="aspect-square w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              />
            </button>
            {photo.caption ? <p className="mt-1.5 text-sm text-muted">{photo.caption}</p> : null}
          </li>
        ))}
      </ul>

      <dialog
        ref={dialog}
        onClose={() => setOpen(null)}
        onClick={(event) => {
          // Щелчок по тёмному полю вокруг фото закрывает просмотр.
          if (event.target === dialog.current) dialog.current?.close();
        }}
        className="m-0 h-dvh max-h-none w-screen max-w-none bg-black/95 p-0 text-white backdrop:bg-black/80"
        aria-label={current?.caption ?? current?.name}
      >
        {current ? (
          <div
            className="flex h-full flex-col"
            onTouchStart={(event) => (touch.current = event.touches[0].clientX)}
            onTouchEnd={(event) => {
              if (touch.current === null) return;
              const dx = event.changedTouches[0].clientX - touch.current;
              if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
              touch.current = null;
            }}
          >
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <p className="font-mono text-sm text-white/80" aria-live="polite">
                {words.photoOf
                  .replace("{n}", String((open ?? 0) + 1))
                  .replace("{total}", String(photos.length))}
              </p>
              <div className="flex items-center gap-1">
                <a
                  href={`${current.url}?download`}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-xs px-3 text-sm hover:bg-white/10"
                >
                  <Download className="h-4 w-4" aria-hidden="true" />
                  {words.download}
                </a>
                <button
                  type="button"
                  onClick={() => dialog.current?.close()}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-xs hover:bg-white/10"
                  aria-label={words.close}
                  autoFocus
                >
                  <X className="h-6 w-6" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 sm:px-16">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                key={current.id}
                src={current.preview}
                alt={current.caption ?? ""}
                width={current.width ?? undefined}
                height={current.height ?? undefined}
                className="max-h-full max-w-full object-contain"
              />
              {photos.length > 1 ? (
                <>
                  <button
                    type="button"
                    onClick={() => step(-1)}
                    className="absolute left-1 top-1/2 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 hover:bg-white/15 sm:left-3"
                    aria-label={words.previous}
                  >
                    <ChevronLeft className="h-7 w-7" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => step(1)}
                    className="absolute right-1 top-1/2 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 hover:bg-white/15 sm:right-3"
                    aria-label={words.next}
                  >
                    <ChevronRight className="h-7 w-7" aria-hidden="true" />
                  </button>
                </>
              ) : null}
            </div>

            <p className="min-h-12 px-4 py-3 text-center text-sm text-white/85">{current.caption}</p>
          </div>
        ) : null}
      </dialog>
    </>
  );
}
