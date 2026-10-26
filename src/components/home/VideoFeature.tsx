import Link from "next/link";
import { ArrowRight } from "lucide-react";

import VideoWindow from "@/components/video/VideoWindow";
import type { Dictionary, Lang } from "@/lib/i18n";
import { FEATURED_VIDEO } from "@/lib/videos";

/*
  Окно с видео на главной.

  Своим разделом, а не в первом экране: там человек должен понять, что это
  за сайт и как сообщить о нарушении, и движущаяся картинка рядом с
  заголовком перетягивала бы взгляд с главного.

  Ролики вертикальные, поэтому окно узкое и стоит справа от текста, а не
  растянуто на всю ширину: растянутое оно было бы выше экрана.
*/
export default function VideoFeature({ dict, lang }: { dict: Dictionary; lang: Lang }) {
  const video = FEATURED_VIDEO;
  if (!video) return null;

  const title = video.title[lang];

  return (
    <section className="border-t border-line">
      <div className="mx-auto grid max-w-[1400px] gap-10 px-4 py-14 sm:px-6 sm:py-16 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-20 lg:px-10 lg:py-24">
        <div>
          <h2 className="text-2xl lg:text-3xl">{dict.home.videoTitle}</h2>
          <p className="mt-4 max-w-prose text-lg text-muted">{dict.home.videoLead}</p>

          <p className="mt-8 text-lg">{title}</p>
          {video.source ? (
            <p className="mt-1 text-sm text-muted">
              {dict.videosPage.source}: {video.source[lang]}
            </p>
          ) : null}

          <Link
            href={`/${lang}/videos`}
            className="mt-6 inline-flex items-center gap-1 text-signal hover:underline"
          >
            {dict.home.videoAll}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        <VideoWindow
          video={video}
          title={title}
          labels={{
            play: dict.videosPage.play,
            pause: dict.videosPage.pause,
            soundOn: dict.videosPage.soundOn,
            soundOff: dict.videosPage.soundOff,
          }}
          className="mx-auto w-full max-w-[280px] sm:max-w-[320px] lg:mx-0 lg:w-[340px] lg:max-w-none"
        />
      </div>
    </section>
  );
}
