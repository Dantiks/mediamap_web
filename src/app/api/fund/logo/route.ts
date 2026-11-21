import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { sendFile } from "@/server/fund-send";

/** Логотип фонда, загруженный в панели. Без него страница берёт файл из public. */

export const dynamic = "force-dynamic";

export async function GET() {
  const profile = await db.fundProfile.findUnique({ where: { id: 1 }, select: { logoKey: true } });
  if (!profile?.logoKey) return new NextResponse(null, { status: 404 });
  // Адрес один, а логотип могут заменить — поэтому кэш короткий.
  return sendFile({ key: profile.logoKey, type: "image/webp", cache: "public, max-age=300" });
}
