import type { Metadata } from "next";
import { notFound } from "next/navigation";

import VideoCard from "@/components/video/VideoCard";
import { formatDate } from "@/lib/format";
import { isReadyLanguage } from "@/lib/i18n";
import { VIDEOS } from "@/lib/videos";
import { getContent } from "@/server/content";

/*
  Все видео: превью, название, длительность, дата. Нажатие на превью
  открывает плеер на его же месте — см. VideoCard.

  Список берётся из src/lib/videos.ts, база тут ни при чём.
*/

export const revalidate = 3600;

type Params = { lang: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { lang } = await params;
  if (!isReadyLanguage(lang)) return {};
  const dict = await getContent(lang);
  return {
    title: dict.videosPage.title,
    description: dict.videosPage.lead,
  };
}

export default async function VideosPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { lang } = await params;
  if (!isReadyLanguage(lang)) notFound();

  const dict = await getContent(lang);
  const words = dict.videosPage;

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6 lg:px-10">
      <div className="max-w-3xl">
        <h1 className="text-3xl sm:text-4xl">{words.title}</h1>
        <p className="mt-4 text-lg text-muted">{words.lead}</p>
      </div>

      {VIDEOS.length === 0 ? (
        <p className="mt-10 text-muted">{words.empty}</p>
      ) : (
        /* Ролики вертикальные: в ряд их встаёт до четырёх, и каждый всё
           ещё смотрится, не растягиваясь выше экрана. */
        <ul className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-8">
          {VIDEOS.map((video) => {
            const title = video.title[lang];
            const published = new Date(`${video.publishedAt}T12:00:00+06:00`);
            return (
              <li key={video.id} id={video.id} className="scroll-mt-24">
                <VideoCard
                  video={video}
                  title={title}
                  playLabel={words.play}
                  durationLabel={words.duration}
                />
                <h2 className="mt-3 text-base sm:text-lg">{title}</h2>
                <p className="mt-1 text-sm text-muted">
                  <time dateTime={video.publishedAt} className="tabular-nums">
                    {formatDate(published, lang)}
                  </time>
                  {video.source ? (
                    <>
                      <span aria-hidden="true"> · </span>
                      {words.source}: {video.source[lang]}
                    </>
                  ) : null}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
