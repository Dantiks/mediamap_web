import { NextResponse, type NextRequest } from "next/server";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";

import { VIDEOS } from "@/lib/videos";

/*
  Раздача видео и их превью из media/videos/.

  Почему не public: из public Next отдаёт только то, что лежало там во время
  сборки, а видео кладут на сервер руками, после. Положил файл — и он
  открывается, без пересборки.

  Отдаём строго то, что названо в src/lib/videos.ts. Имя из адреса в путь
  не склеивается вовсе: ищем его в списке, и если его там нет — 404. Так
  «../../.env» в адресе ничего не находит, даже не доходя до диска.

  Запросы с Range обязательны. Safari без ответа 206 видео не играет
  совсем, а остальные без него не умеют перемотку и тянут файл целиком.
*/

const ROOT = path.join(process.cwd(), "media", "videos");

const TYPES: Record<string, string> = {
  ".mp4": "video/mp4",
  ".jpg": "image/jpeg",
};

const KNOWN = new Set(VIDEOS.flatMap((video) => [video.file, video.poster]));

type Params = { params: Promise<{ file: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const { file } = await params;
  const type = TYPES[path.extname(file)];
  if (!KNOWN.has(file) || !type) return new NextResponse(null, { status: 404 });

  const target = path.join(ROOT, file);
  let size: number;
  try {
    size = (await stat(target)).size;
  } catch {
    // В списке есть, а на диске нет — забыли положить. Для человека это
    // то же, что видео нет.
    return new NextResponse(null, { status: 404 });
  }

  const headers: Record<string, string> = {
    "Content-Type": type,
    "Accept-Ranges": "bytes",
    // Под тем же именем другой файл не появится: заменённое видео
    // получает новое имя. День кэша снимает повторные загрузки при
    // переходах по сайту.
    "Cache-Control": "public, max-age=86400",
    "X-Content-Type-Options": "nosniff",
  };

  const range = parseRange(request.headers.get("range"), size);
  if (range === "invalid") {
    return new NextResponse(null, {
      status: 416,
      headers: { ...headers, "Content-Range": `bytes */${size}` },
    });
  }

  const { start, end } = range ?? { start: 0, end: size - 1 };
  // Node отдаёт свой ReadableStream, а Response ждёт браузерный. Это один
  // и тот же поток, расходятся только описания типов.
  const stream = Readable.toWeb(
    createReadStream(target, { start, end }),
  ) as unknown as ReadableStream;

  return new NextResponse(stream, {
    status: range ? 206 : 200,
    headers: {
      ...headers,
      "Content-Length": String(end - start + 1),
      ...(range ? { "Content-Range": `bytes ${start}-${end}/${size}` } : {}),
    },
  });
}

/*
  Один диапазон из заголовка Range. Несколько через запятую браузеры за
  видео не присылают — на такой отвечаем файлом целиком, это разрешено.
*/
function parseRange(
  header: string | null,
  size: number,
): { start: number; end: number } | "invalid" | null {
  const match = header?.match(/^bytes=(\d*)-(\d*)$/);
  if (!match) return null;

  const [, from, to] = match;
  let start: number;
  let end: number;
  if (from === "") {
    // «bytes=-500» — последние пятьсот байт.
    if (to === "") return "invalid";
    start = Math.max(size - Number(to), 0);
    end = size - 1;
  } else {
    start = Number(from);
    end = to === "" ? size - 1 : Math.min(Number(to), size - 1);
  }

  if (start > end || start >= size) return "invalid";
  return { start, end };
}
