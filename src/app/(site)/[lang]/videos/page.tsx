import type { Metadata } from "next";
import { notFound } from "next/navigation";

import VideoShelf from "@/components/home/VideoShelf";
import { isReadyLanguage } from "@/lib/i18n";
import { getContent } from "@/server/content";
import { loadVideos } from "@/server/videos";

/*
  Все ролики одной страницей.

  Появилась вместе с каруселью на первом экране: с неё нужно было куда-то
  вести. На главной стоит полка с прокруткой вбок — там ролики кончаются
  там же, где кончается экран; здесь они просто лежат все.
*/

export const revalidate = 300;

type Params = { lang: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { lang } = await params;
  if (!isReadyLanguage(lang)) return {};
  const dict = await getContent(lang);
  return { title: dict.videosPage.title, description: dict.videosPage.lead };
}

export default async function VideosPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { lang } = await params;
  if (!isReadyLanguage(lang)) notFound();

  const dict = await getContent(lang);

  // Потолок выше, чем на главной: сюда приходят именно за роликами.
  const videos = await loadVideos(lang, 60);

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6 lg:px-10">
      <h1 className="text-3xl sm:text-4xl">{dict.videosPage.title}</h1>
      <p className="mt-4 max-w-prose text-lg text-muted">{dict.videosPage.lead}</p>

      {videos.length === 0 ? (
        <p className="mt-10 text-muted">{dict.videosPage.empty}</p>
      ) : (
        /* Та же сетка, что и на главной, но без заголовка раздела и без
           прокрутки вбок: здесь ролики переносятся по строкам. */
        <VideoShelf dict={dict} videos={videos} layout="grid" />
      )}
    </div>
  );
}
