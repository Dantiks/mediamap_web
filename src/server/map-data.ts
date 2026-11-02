import { db } from "@/lib/db";
import { REPORT_STATUS } from "@/lib/enums";
import { KG_REGIONS, regionCenter } from "@/lib/regions";
import type { Lang } from "@/lib/i18n/languages";

// Запрос для карты случаев. На карту попадает только подтверждённое: заявка
// в очереди ещё никем не проверена, и ставить её на публичную карту нельзя.

// Длиннее в подписи к метке не читают, целиком текст стоит на странице случая.
const SNIPPET = 240;

export type MapCase = {
  publicId: string;
  /** Пусто у старых записей — тогда показываем название вида. */
  headline: string | null;
  typeSlug: string;
  lat: number;
  lng: number;
  /** false — точных координат нет, метка стоит в середине области. */
  exact: boolean;
  city: string | null;
  region: string | null;
  text: string | null;
  createdAt: string;
  /** Снимок, открытый проверяющим. Снимки с QR-кодом сюда не попадают. */
  imageId: string | null;
};

export type MapData = {
  cases: MapCase[];
  /** Сколько случаев не на карте: у них нет ни координат, ни области. */
  withoutPlace: number;
};

const snippet = (text: string | null): string | null => {
  const trimmed = text?.trim();
  if (!trimmed) return null;
  return trimmed.length > SNIPPET
    ? `${trimmed.slice(0, SNIPPET).trimEnd()}…`
    : trimmed;
};

export async function loadMapCases(lang: Lang): Promise<MapData> {
  const rows = await db.report.findMany({
    where: { status: REPORT_STATUS.APPROVED },
    orderBy: { createdAt: "desc" },
    include: {
      violationType: { select: { slug: true } },
      attachments: {
        where: { public: true, kind: "IMAGE", qrSummary: null },
        select: { id: true },
        orderBy: { createdAt: "asc" },
        take: 1,
      },
    },
  });

  const cases: MapCase[] = [];
  let withoutPlace = 0;

  for (const row of rows) {
    const exact = row.lat !== null && row.lng !== null;
    const center = regionCenter(row.regionCode);
    const lat = exact ? row.lat : center?.[0];
    const lng = exact ? row.lng : center?.[1];

    if (lat === undefined || lat === null || lng === undefined || lng === null) {
      withoutPlace += 1;
      continue;
    }

    cases.push({
      publicId: row.publicId,
      headline: row.headline,
      typeSlug: row.violationType.slug,
      lat,
      lng,
      exact,
      city: row.city,
      region:
        KG_REGIONS.find((region) => region.code === row.regionCode)?.name[lang] ??
        null,
      text: snippet(row.authorComment) ?? snippet(row.moderatorComment),
      createdAt: row.createdAt.toISOString(),
      imageId: row.attachments[0]?.id ?? null,
    });
  }

  return { cases, withoutPlace };
}
