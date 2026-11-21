import { NextResponse, type NextRequest } from "next/server";

import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { canEditContent } from "@/lib/enums";
import { FUND_KIND } from "@/lib/fund-rules";
import { PRIVATE_CACHE, PUBLIC_CACHE, sendFile } from "@/server/fund-send";

/*
  Файлы проектов фонда.

  Файл опубликованного проекта видят все — так решил фонд. Файл черновика —
  только редактор: он смотрит, как проект будет выглядеть, до публикации.

  ?v=preview и ?v=thumb — уменьшенные копии фотографии (у видео preview —
  кадр-обложка). Без параметра — сам файл: видео играет во вкладке,
  остальное скачивается под своим именем.
*/

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const file = await db.fundFile.findUnique({
    where: { id },
    include: { project: { select: { published: true } } },
  });
  if (!file) return new NextResponse(null, { status: 404 });

  const published = file.project.published;
  if (!published) {
    const user = await currentUser();
    if (!user || !canEditContent(user.role)) return new NextResponse(null, { status: 404 });
  }
  const cache = published ? PUBLIC_CACHE : PRIVATE_CACHE;

  const variant = request.nextUrl.searchParams.get("v");
  if (variant === "preview" || variant === "thumb") {
    const key = variant === "preview" ? file.previewKey : file.thumbKey;
    if (!key) return new NextResponse(null, { status: 404 });
    return sendFile({ key, type: "image/webp", cache });
  }

  return sendFile({
    key: file.key,
    type: file.mime,
    size: file.size,
    range: request.headers.get("range"),
    cache,
    download: file.kind === FUND_KIND.VIDEO && !request.nextUrl.searchParams.has("download")
      ? undefined
      : file.name,
  });
}
