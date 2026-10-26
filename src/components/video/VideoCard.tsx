"use client";

import { useState } from "react";
import { Play } from "lucide-react";

import { formatDuration, videoUrl, type Video } from "@/lib/videos";

/*
  Карточка в списке видео: превью с длительностью, по нажатию на его месте
  открывается плеер.

  Плеер встаёт прямо в карточку, а не во всплывающее окно. Окно пришлось бы
  учить ловить фокус, закрываться по Esc и возвращать фокус обратно — и всё
  ради того, чтобы показать вертикальный ролик того же размера, что и
  превью. Управление у плеера браузерное: оно знакомо и с клавиатуры
  работает без нашей помощи.

  Пока не нажали, видео не грузится вовсе: на странице лишь картинки.
*/

type Props = {
  video: Video;
  title: string;
  playLabel: string;
  durationLabel: string;
};

export default function VideoCard({ video, title, playLabel, durationLabel }: Props) {
  const [open, setOpen] = useState(false);
  const ratio = { aspectRatio: `${video.width} / ${video.height}` };

  if (open) {
    return (
      <video
        src={videoUrl(video.file)}
        poster={videoUrl(video.poster)}
        aria-label={title}
        width={video.width}
        height={video.height}
        controls
        autoPlay
        playsInline
        // Два ролика, играющие разом, — это шум. Запустили один —
        // остальные на странице встают.
        onPlay={(event) => {
          document.querySelectorAll("video").forEach((other) => {
            if (other !== event.currentTarget) other.pause();
          });
        }}
        className="block w-full bg-ink"
        style={ratio}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="group relative block w-full overflow-hidden bg-ink"
      style={ratio}
    >
      {/* Подпись даёт кнопка, у картинки alt пустой: иначе название
          прочитают дважды. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={videoUrl(video.poster)}
        alt=""
        width={video.width}
        height={video.height}
        loading="lazy"
        className="h-full w-full object-cover transition-opacity group-hover:opacity-90"
      />
      <span className="absolute inset-0 flex items-center justify-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-ink/70 text-surface transition-colors group-hover:bg-signal">
          <Play className="ml-1 h-7 w-7" aria-hidden="true" />
        </span>
      </span>
      <span className="absolute right-2 bottom-2 rounded-xs bg-ink/80 px-1.5 py-0.5 font-mono text-xs text-surface tabular-nums">
        <span className="sr-only">{durationLabel}: </span>
        {formatDuration(video.duration)}
      </span>
      <span className="sr-only">
        {playLabel}: {title}
      </span>
    </button>
  );
}
