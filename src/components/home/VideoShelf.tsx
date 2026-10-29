"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { ArrowRight, Play } from "lucide-react";

import { clock } from "@/lib/format";
import type { Dictionary, Lang } from "@/lib/i18n";
import type { VideoRow } from "@/server/videos";

/*
  Полка коротких роликов на главной.

  Ролики вертикальные, как в соцсетях, поэтому карточки 9:16 и стоят в ряд
  с прокруткой вбок: на телефоне это привычный жест, а на широком экране
  четыре помещаются целиком.

  Ничего не грузится, пока не нажали: preload="none" и обложка картинкой.
  Иначе главная тянула бы десятки мегабайт ради блока, до которого человек
  может и не долистать. Автозапуска нет намеренно — звук или движение без
  спроса раздражают, а у нас страница про доверие.
*/

type Props = {
  dict: Dictionary;
  videos: VideoRow[];
  /** Язык нужен только ссылке «все ролики» — на самой этой странице её нет. */
  lang?: Lang;
  /*
    Как раскладывать. На главной это лента с прокруткой вбок, на странице
    роликов — обычная сетка с переносом: там ролики не идут приложением к
    разделу, они и есть содержимое страницы.
  */
  layout?: "shelf" | "grid";
};

export default function VideoShelf({ dict, videos, lang, layout = "shelf" }: Props) {
  const words = dict.home;
  if (videos.length === 0) return null;

  const grid = layout === "grid";

  const list = grid ? (
    <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:mt-10 lg:grid-cols-4">
      {videos.map((video) => (
        <li key={video.id}>
          <Card video={video} title={video.title} playLabel={words.videoPlay} />
        </li>
      ))}
    </ul>
  ) : null;

  if (grid) return list;

  return (
    <section className="border-t border-line bg-surface">
      <div className="mx-auto max-w-[1400px] px-4 py-14 sm:px-6 sm:py-16 lg:px-10 lg:py-24">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <h2 className="text-2xl lg:text-3xl">{words.videoTitle}</h2>

          {/* Полка показывает не всё: ролики кончаются там же, где экран.
              Ссылка ведёт туда, где они лежат целиком. */}
          {lang ? (
            <Link
              href={`/${lang}/videos`}
              className="inline-flex items-center gap-1 text-base text-signal hover:underline"
            >
              {words.videoAll}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          ) : null}
        </div>

        <p className="mt-2 max-w-prose text-muted">{words.videoLead}</p>

        {/* Прокрутка вбок, а не перенос: иначе на планшете последний ролик
            уезжал бы один во вторую строку. Отрицательные поля — чтобы
            карточки «утекали» за край страницы, как лента. */}
        <ul className="mt-8 -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 lg:mt-12 lg:-mx-10 lg:px-10">
          {videos.map((video) => (
            <li
              key={video.id}
              /* Широкий ролик с YouTube в карточку под рилс не влезает:
                 он лёг бы чёрными полосами сверху и снизу. Поэтому у
                 широких карточка шире, а высота у всех одна — иначе ряд
                 выглядел бы лесенкой. */
              className={`shrink-0 snap-start ${
                video.wide ? "w-[85vw] sm:w-[25rem] lg:w-[28rem]" : "w-[70vw] sm:w-56 lg:w-64"
              }`}
            >
              <Card
                video={video}
                title={video.title}
                playLabel={words.videoPlay}
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Card({
  video,
  title,
  playLabel,
}: {
  video: VideoRow;
  title: string;
  playLabel: string;
}) {
  const [playing, setPlaying] = useState(false);
  const player = useRef<HTMLVideoElement>(null);

  return (
    <figure>
      <div
        className={`relative overflow-hidden rounded-xs bg-deep ${
          video.wide ? "aspect-video" : "aspect-[9/16]"
        }`}
      >
        {video.youtube ? (
          /*
            Ролик с YouTube. До нажатия — только их обложка картинкой:
            плеер YouTube тянет мегабайты скриптов и ставит свои куки, и
            грузить его ради карточки, которую могут и не открыть, незачем.
            После нажатия — плеер с youtube-nocookie, он сразу играет.
          */
          playing ? (
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${video.youtube}?autoplay=1&rel=0`}
              title={title}
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
              className="h-full w-full"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`https://i.ytimg.com/vi/${video.youtube}/hqdefault.jpg`}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover"
            />
          )
        ) : (
          <video
            ref={player}
            src={`/api/videos/${video.id}`}
            poster={video.hasPoster ? `/api/videos/${video.id}?poster` : undefined}
            preload="none"
            playsInline
            controls={playing}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            className="h-full w-full object-cover"
          />
        )}

        {/* Своя кнопка поверх обложки: пока ролик не запущен, нативные
            элементы плеера мы не показываем, иначе на каждой карточке
            висела бы чёрная панель. */}
        {playing ? null : (
          <button
            type="button"
            onClick={() => {
              setPlaying(true);
              if (!video.youtube) void player.current?.play();
            }}
            className="absolute inset-0 flex items-center justify-center bg-black/10 transition-colors hover:bg-black/20"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-surface/90">
              <Play className="ml-0.5 h-6 w-6 text-ink" aria-hidden="true" />
            </span>
            <span className="sr-only">
              {playLabel}: {title}
            </span>
          </button>
        )}
      </div>

      <figcaption className="mt-3 text-base">
        {title}
        {video.seconds ? (
          <span className="mt-1 block text-sm text-muted tabular-nums">
            {clock(video.seconds)}
          </span>
        ) : null}
      </figcaption>
    </figure>
  );
}
