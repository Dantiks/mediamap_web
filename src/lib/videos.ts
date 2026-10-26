import type { Lang } from "./i18n";

/*
  Видео сайта: страница /videos и окно на главной.

  Список ведётся здесь, в коде, — так решил проект. Видео немного, меняются
  они редко, и раздел в панели ради двух строк был бы дороже самих строк.
  Понадобится чаще — перенесём в базу, а форма записи останется той же.

  Сами файлы в git не лежат: ролик весит мегабайты, и каждый новый навсегда
  раздувал бы историю репозитория. Они лежат в папке media/videos/ рядом с
  проектом (на сервере её кладут руками, см. docs/deploy.md), раздаёт их
  обработчик /api/videos/[file]. Он отдаёт только файлы, названные в этом
  списке, — всё прочее в папке для сайта не существует.

  Как добавить видео:
    1. Перепаковать с индексом в начале файла (moov перед mdat) — иначе
       браузер качает файл целиком, прежде чем показать первый кадр.
       ffmpeg -i in.mov -c copy -movflags +faststart out.mp4
    2. Снять превью: кадр в JPEG того же размера, что и видео.
    3. Положить оба в media/videos/ и вписать сюда.

  Кодек — H.264. iPhone по умолчанию пишет HEVC, а его не играет Chrome на
  части Android и Windows: вместо видео человек увидит чёрный прямоугольник.
*/

export type Video = {
  /** Якорь на странице /videos. */
  id: string;
  /** Имя файла в media/videos/. */
  file: string;
  /** Превью там же. */
  poster: string;
  title: Record<Lang, string>;
  /** Чьё видео. Пусто — наше собственное. */
  source?: Record<Lang, string>;
  /** Секунды. Пишем руками: читать длину из файла ради подписи незачем. */
  duration: number;
  /** Ширина и высота кадра — по ним окно держит пропорцию до загрузки. */
  width: number;
  height: number;
  /*
    Есть ли звуковая дорожка. Кнопка звука у беззвучного ролика ничего не
    делает, и человек решит, что сломан звук у него.
  */
  hasAudio: boolean;
  /** Дата публикации, YYYY-MM-DD. */
  publishedAt: string;
};

/*
  Первым идёт то, что крутится на главной. Порядок на странице /videos —
  этот же.

  Оба ролика присланы проектом файлами IMG_1159 и IMG_1161. Названия
  взяты с титра в первом кадре; варианты различаются только оформлением,
  поэтому в названии указано, какой светлый, а какой тёмный.
*/
export const VIDEOS: Video[] = [
  {
    id: "pinterest-collage-light",
    file: "pinterest-collage-light.mp4",
    poster: "pinterest-collage-light.jpg",
    title: {
      ru: "Коллаж в Pinterest: светлый вариант",
      ky: "Pinterest'теги коллаж: ачык түстөгү вариант",
      en: "Pinterest collage: light version",
    },
    source: { ru: "Даниэл Аманов", ky: "Даниэл Аманов", en: "Daniel Amanov" },
    duration: 12,
    width: 464,
    height: 848,
    hasAudio: false,
    publishedAt: "2026-09-24",
  },
  {
    id: "pinterest-collage-dark",
    file: "pinterest-collage-dark.mp4",
    poster: "pinterest-collage-dark.jpg",
    title: {
      ru: "Коллаж в Pinterest: тёмный вариант",
      ky: "Pinterest'теги коллаж: кочкул түстөгү вариант",
      en: "Pinterest collage: dark version",
    },
    source: { ru: "Даниэл Аманов", ky: "Даниэл Аманов", en: "Daniel Amanov" },
    duration: 12,
    width: 464,
    height: 848,
    hasAudio: false,
    publishedAt: "2026-09-24",
  },
];

/** Видео для окна на главной. */
export const FEATURED_VIDEO: Video | undefined = VIDEOS[0];

/** Адрес файла из media/videos/. */
export const videoUrl = (file: string): string => `/api/videos/${file}`;

/** Длительность в виде 0:12 или 1:05:30. */
export const formatDuration = (seconds: number): string => {
  const total = Math.round(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
};
