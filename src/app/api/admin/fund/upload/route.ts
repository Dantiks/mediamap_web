import { createWriteStream } from "node:fs";
import { readdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";

import { currentUser } from "@/lib/auth";
import { canEditContent } from "@/lib/enums";
import { FUND_CHUNK_BYTES, FUND_MAX_BYTES, fundRuleFor } from "@/lib/fund-rules";
import { addProjectFile } from "@/server/fund";
import { ensureTempDir, tempFile } from "@/server/storage";

/*
  Приём файлов проекта фонда — кусками.

  Серверное действие для этого не годится: оно поднимает весь файл в
  память, а Caddy перед сайтом пропускает запрос не больше 60 МБ. Файл до
  100 МБ браузер режет на куски по 8 МБ и шлёт их по очереди сюда; куски
  дописываются во временный файл, и на последнем файл заводится в проект.

  Каждый кусок говорит, с какого байта он начинается. Не совпало с тем,
  что уже лежит, — отвечаем 409 и сколько у нас есть: браузер продолжит с
  этого места, а не начнёт файл заново и не склеит его с дырой.

  POST ?project=12&upload=<uuid>&offset=0&total=12345&name=<имя>
*/

export const dynamic = "force-dynamic";

const json = (body: object, status = 200) => NextResponse.json(body, { status });

export async function POST(request: NextRequest) {
  const user = await currentUser();
  if (!user || !canEditContent(user.role)) return json({ error: "Нет доступа" }, 403);

  // Загрузку начинает только наша же страница. Кука сессии с SameSite=Lax
  // и так не уходит с чужого сайта, это второй замок.
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).host !== request.headers.get("host")) {
    return json({ error: "Чужой источник запроса" }, 403);
  }

  const query = request.nextUrl.searchParams;
  const projectId = Number.parseInt(query.get("project") ?? "", 10);
  const upload = query.get("upload") ?? "";
  const offset = Number.parseInt(query.get("offset") ?? "", 10);
  const total = Number.parseInt(query.get("total") ?? "", 10);
  const name = query.get("name") ?? "";

  if (!projectId || !/^[0-9a-f-]{36}$/.test(upload) || !(offset >= 0) || !(total > 0)) {
    return json({ error: "Плохой запрос" }, 400);
  }
  if (!fundRuleFor(name)) return json({ error: `Такой тип файла не принимаем: ${name}` }, 415);
  if (total > FUND_MAX_BYTES) return json({ error: "Файл больше 100 МБ" }, 413);
  if (!request.body) return json({ error: "Пустой кусок" }, 400);

  await ensureTempDir();
  const temp = tempFile(upload);

  if (offset === 0) {
    await sweepStale(path.dirname(temp));
  } else {
    const have = await stat(temp).then((info) => info.size, () => 0);
    if (have !== offset) return json({ received: have }, 409);
  }

  // Кусок длиннее обещанного или файл длиннее заявленного — обрываем,
  // а не пишем на диск сколько пришлют.
  const limit = Math.min(FUND_CHUNK_BYTES + 1024, total - offset);
  let got = 0;
  const guard = new Transform({
    transform(chunk: Buffer, _encoding, done) {
      got += chunk.length;
      if (got > limit) done(new Error("too-big"));
      else done(null, chunk);
    },
  });

  try {
    await pipeline(
      Readable.fromWeb(request.body as import("node:stream/web").ReadableStream),
      guard,
      createWriteStream(temp, { flags: offset === 0 ? "w" : "a" }),
    );
  } catch (error) {
    await rm(temp, { force: true });
    const tooBig = error instanceof Error && error.message === "too-big";
    return json({ error: tooBig ? "Кусок больше заявленного" : "Загрузка оборвалась" }, tooBig ? 413 : 400);
  }

  const received = offset + got;
  if (received < total) return json({ received });

  const result = await addProjectFile(projectId, temp, name);
  if ("error" in result) return json(result, 422);

  revalidatePath(`/admin/fund/${projectId}`);
  revalidatePath("/[lang]/media-consult", "page");
  revalidatePath("/[lang]/media-consult/[project]", "page");
  return json({ received, done: true, id: result.id });
}

/** Брошенные загрузки старше суток — убираем, чтобы не копились на диске. */
async function sweepStale(dir: string) {
  const day = Date.now() - 24 * 60 * 60 * 1000;
  const names = await readdir(dir).catch(() => [] as string[]);
  await Promise.all(
    names
      .filter((name) => name.endsWith(".part"))
      .map(async (name) => {
        const full = path.join(dir, name);
        const info = await stat(full).catch(() => null);
        if (info && info.mtimeMs < day) await rm(full, { force: true });
      }),
  );
}
