import { createReadStream } from "node:fs";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";

import { parseRange } from "@/lib/http-range";
import { filePath } from "./storage";

/*
  Отдача файла фонда из хранилища.

  Общее для фотографий, видео, документов, логотипа и фото команды:
  Range для видео, nosniff, чтобы браузер не угадывал тип по содержимому,
  и имя для скачивания.
*/
export function sendFile({
  key,
  type,
  size,
  range,
  cache,
  download,
}: {
  key: string;
  type: string;
  /** Размер известен — отвечаем на Range. */
  size?: number | null;
  range?: string | null;
  cache: string;
  /** Имя файла: отдать на скачивание, а не открывать во вкладке. */
  download?: string;
}): NextResponse {
  const headers: Record<string, string> = {
    "Content-Type": type,
    "Cache-Control": cache,
    "X-Content-Type-Options": "nosniff",
    // Документ, открытый во вкладке, не должен ничего исполнять от имени сайта.
    "Content-Security-Policy": "default-src 'none'; img-src 'self'; media-src 'self'; style-src 'unsafe-inline'; sandbox",
  };

  if (download) {
    // filename* — для кириллицы; filename — запасной для старых программ.
    const ascii = download.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
    headers["Content-Disposition"] =
      `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(download)}`;
  }

  if (size) {
    headers["Accept-Ranges"] = "bytes";
    const part = parseRange(range ?? null, size);
    if (part) {
      const stream = Readable.toWeb(
        createReadStream(filePath(key), { start: part.start, end: part.end }),
      ) as unknown as ReadableStream;
      return new NextResponse(stream, {
        status: 206,
        headers: {
          ...headers,
          "Content-Range": `bytes ${part.start}-${part.end}/${size}`,
          "Content-Length": String(part.end - part.start + 1),
        },
      });
    }
    headers["Content-Length"] = String(size);
  }

  const stream = Readable.toWeb(createReadStream(filePath(key))) as unknown as ReadableStream;
  return new NextResponse(stream, { headers });
}

export const PUBLIC_CACHE = "public, max-age=3600";
export const PRIVATE_CACHE = "private, no-store";
