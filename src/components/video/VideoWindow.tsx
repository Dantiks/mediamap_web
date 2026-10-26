"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play, Volume2, VolumeX } from "lucide-react";

import { videoUrl, type Video } from "@/lib/videos";

/*
  Окно с видео, которое крутится само: без звука, по кругу.

  Само оно запускается не везде:
    * при prefers-reduced-motion — человек прямо попросил, чтобы на экране
      ничего не двигалось без спроса;
    * на телефоне и при экономии трафика — ролик в несколько мегабайт,
      который никто не просил, съедает чужой мобильный пакет.
  Там вместо него превью с кнопкой: кто хочет, нажмёт.

  Крутится, только пока окно видно. За краем экрана оно встаёт на паузу —
  греть процессор ради того, чего никто не видит, незачем.

  Кнопка паузы стоит всегда, пока видео идёт: всё, что движется само дольше
  пяти секунд, человек должен уметь остановить (WCAG 2.2.2). Остановил — и
  мы больше не запускаем его сами, даже когда окно снова попадёт в кадр.
*/

type Labels = {
  play: string;
  pause: string;
  soundOn: string;
  soundOff: string;
};

type Props = { video: Video; title: string; labels: Labels; className?: string };

export default function VideoWindow({ video, title, labels, className = "" }: Props) {
  const ref = useRef<HTMLVideoElement>(null);
  // Пока видео ни разу не пошло, поверх него превью с кнопкой. Так же
  // выглядит и разметка с сервера, и разницы при загрузке не видно.
  // Ставится по событию play, а не по нашему вызову: вызов браузер может
  // отклонить или оборвать, а событие значит, что видео правда идёт.
  const [started, setStarted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  // Человек нажал паузу — его решение главнее нашего автозапуска.
  const stoppedByUser = useRef(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const quiet = window.matchMedia(
      "(prefers-reduced-motion: reduce), (max-width: 767px)",
    ).matches;
    const saveData =
      (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
        ?.saveData === true;
    if (quiet || saveData) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (stoppedByUser.current) return;
          // Браузер может отказать и беззвучному ролику — например, в
          // режиме энергосбережения. Тогда остаётся превью с кнопкой.
          element.play().catch(() => {});
        } else {
          element.pause();
        }
      },
      { threshold: 0.25 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const start = () => {
    const element = ref.current;
    if (!element) return;
    stoppedByUser.current = false;
    // Нажал сам — значит, хочет смотреть со звуком, если он есть.
    if (video.hasAudio) {
      element.muted = false;
      setMuted(false);
    }
    void element.play();
  };

  const toggle = () => {
    const element = ref.current;
    if (!element) return;
    if (element.paused) {
      stoppedByUser.current = false;
      void element.play();
    } else {
      stoppedByUser.current = true;
      element.pause();
    }
  };

  const toggleSound = () => {
    const element = ref.current;
    if (!element) return;
    element.muted = !element.muted;
    setMuted(element.muted);
  };

  return (
    <div
      className={`relative overflow-hidden border border-line bg-ink ${className}`}
      style={{ aspectRatio: `${video.width} / ${video.height}` }}
    >
      {/* Подписи у ролика нет на экране — её даёт aria-label: без него
          чтение экрана объявит безымянное «видео». */}
      <video
        ref={ref}
        src={videoUrl(video.file)}
        poster={videoUrl(video.poster)}
        aria-label={title}
        width={video.width}
        height={video.height}
        muted
        loop
        playsInline
        preload="none"
        onPlay={() => {
          setStarted(true);
          setPlaying(true);
        }}
        onPause={() => setPlaying(false)}
        className="h-full w-full object-cover"
      />

      {started ? (
        <div className="absolute bottom-3 left-3 flex gap-2">
          <button
            type="button"
            onClick={toggle}
            aria-label={playing ? labels.pause : labels.play}
            title={playing ? labels.pause : labels.play}
            className="flex h-11 w-11 items-center justify-center rounded-xs bg-ink/70 text-surface transition-colors hover:bg-ink"
          >
            {playing ? (
              <Pause className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Play className="h-5 w-5" aria-hidden="true" />
            )}
          </button>

          {video.hasAudio ? (
            <button
              type="button"
              onClick={toggleSound}
              aria-label={muted ? labels.soundOn : labels.soundOff}
              title={muted ? labels.soundOn : labels.soundOff}
              className="flex h-11 w-11 items-center justify-center rounded-xs bg-ink/70 text-surface transition-colors hover:bg-ink"
            >
              {muted ? (
                <VolumeX className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Volume2 className="h-5 w-5" aria-hidden="true" />
              )}
            </button>
          ) : null}
        </div>
      ) : (
        <button
          type="button"
          onClick={start}
          className="group absolute inset-0 flex items-center justify-center"
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-ink/70 text-surface transition-colors group-hover:bg-signal">
            <Play className="ml-1 h-7 w-7" aria-hidden="true" />
          </span>
          <span className="sr-only">
            {labels.play}: {title}
          </span>
        </button>
      )}
    </div>
  );
}
