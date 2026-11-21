import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { PUBLIC_CACHE, sendFile } from "@/server/fund-send";

/** Фото человека из команды фонда. Команда на странице видна всем. */

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const member = await db.fundMember.findUnique({
    where: { id: Number.parseInt(id, 10) || 0 },
    select: { photoKey: true },
  });
  if (!member?.photoKey) return new NextResponse(null, { status: 404 });
  return sendFile({ key: member.photoKey, type: "image/webp", cache: PUBLIC_CACHE });
}
