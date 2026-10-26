import { db } from "@/lib/db";

/** Чистит таблицы перед тестом. Порядок — от зависимых к главным. */
export async function wipe(): Promise<void> {
  await db.aiCheck.deleteMany();
  await db.attachment.deleteMany();
  await db.report.deleteMany();
  await db.session.deleteMany();
  await db.account.deleteMany();
  await db.user.deleteMany();
  await db.violationType.deleteMany();
  await db.newsTranslation.deleteMany();
  await db.newsItem.deleteMany();
  await db.newsSource.deleteMany();
  await db.newsKeyword.deleteMany();
}

/** Три вида нарушений — как в сиде. */
export async function seedTypes(): Promise<void> {
  const slugs = ["hate-speech", "disinformation", "digital-fraud"];
  for (const [sort, slug] of slugs.entries()) {
    await db.violationType.create({ data: { slug, sort } });
  }
}

let counter = 0;

/** Сообщение с разумными значениями по умолчанию. */
export async function makeReport(fields: {
  status?: string;
  headline?: string | null;
  city?: string | null;
  authorComment?: string;
  receiptToken?: string;
  authorId?: number | null;
  slug?: string;
}) {
  counter += 1;
  const type = await db.violationType.findUniqueOrThrow({
    where: { slug: fields.slug ?? "hate-speech" },
  });
  return db.report.create({
    data: {
      publicId: `MM-2026-${String(9000 + counter)}`,
      status: fields.status ?? "PENDING",
      headline: fields.headline ?? null,
      city: fields.city ?? null,
      authorComment: fields.authorComment ?? "Рассказ о случае достаточной длины для проверки.",
      receiptToken: fields.receiptToken ?? `token-${counter}-${Date.now()}`,
      authorId: fields.authorId ?? null,
      violationTypeId: type.id,
    },
  });
}
