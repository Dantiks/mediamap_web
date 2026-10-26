import { randomUUID } from "node:crypto";
import { after } from "next/server";

import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma";
import { ruleFor } from "@/lib/attachment-rules";
import { ATTACHMENT_KIND, REPORT_CHANNEL, REPORT_STATUS, type ReportChannel } from "@/lib/enums";
import { reportSchema, today, type ReportInput } from "@/lib/report-schema";
import type { ViolationSlug } from "@/lib/i18n";
import { assess } from "./ai-review";
import { recordCheck } from "./ai-journal";
import { attachTo, discard, filesFrom, prepare, type FileError } from "./attachments";
import { warmReport } from "./text-translation";

/*
  Запись сообщения о нарушении — общая для формы на сайте и Telegram-бота.

  Раньше всё это жило внутри серверного действия формы. Бот подаёт через
  свой обработчик (api/intake/telegram), и повторять у него проверку, номер,
  оценку и вложения значило бы однажды разойтись: сообщение из бота
  получило бы другой номер, без оценки или без журнала разбора.

  Здесь нет ничего про то, откуда пришло: ограничение частоты, переадресация
  и ответ — у каждого входа свои.
*/

/** Поля формы, которые сверяются по reportSchema. */
const FORM_FIELDS = [
  "typeSlug",
  "link",
  "story",
  "city",
  "regionCode",
  "happenedAt",
  "consent",
  "trap",
] as const;

/** Разбирает поля формы. Ошибки — ключи словаря, по первой на поле. */
export function parseReportForm(
  form: FormData,
): { ok: true; data: ReportInput } | { ok: false; errors: Record<string, string> } {
  const parsed = reportSchema.safeParse(
    Object.fromEntries(FORM_FIELDS.map((field) => [field, form.get(field) ?? ""])),
  );

  if (parsed.success) return { ok: true, data: parsed.data };

  const errors: Record<string, string> = {};
  for (const issue of parsed.error.issues) {
    const field = String(issue.path[0] ?? "form");
    // Первая ошибка по полю важнее остальных: показывать три подряд незачем.
    errors[field] ??= issue.message;
  }
  return { ok: false, errors };
}

/**
 * Публичный номер сообщения: MM-2026-0042.
 *
 * Считаем от последнего номера этого года. Два одновременных сообщения
 * теоретически могут запросить один номер — от этого страхует уникальный
 * индекс и повтор попытки в createReport.
 */
async function nextPublicId(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `MM-${year}-`;

  const last = await db.report.findFirst({
    where: { publicId: { startsWith: prefix } },
    orderBy: { publicId: "desc" },
    select: { publicId: true },
  });

  const lastNumber = last ? Number.parseInt(last.publicId.slice(prefix.length), 10) : 0;
  return `${prefix}${String(lastNumber + 1).padStart(4, "0")}`;
}

/**
 * Дата из формы во время.
 *
 * Полдень по UTC, а не полночь. Полночь при показе в часовом поясе западнее
 * Гринвича съезжает на сутки назад, и случай, помеченный первым числом,
 * читался бы как случившийся тридцать первого. Полдень такого сдвига не даёт
 * ни в одном обитаемом поясе.
 */
const asDate = (value: string): Date => new Date(`${value}T12:00:00Z`);

/** Ошибка уникальности — значит номер увели, пробуем следующий. */
const isDuplicateId = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  (error as { code?: string }).code === "P2002";

/** Всё, что мы знаем о сообщении, кроме публичного номера. */
type NewReport = Omit<Prisma.ReportUncheckedCreateInput, "publicId">;

/** Записывает сообщение, подбирая свободный номер. */
async function createReport(fields: NewReport): Promise<{ id: number; publicId: string }> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const publicId = await nextPublicId();
    try {
      return await db.report.create({
        data: { publicId, ...fields },
        select: { id: true, publicId: true },
      });
    } catch (error) {
      if (!isDuplicateId(error)) throw error;
    }
  }

  throw new Error("Не удалось подобрать свободный номер сообщения");
}

/*
  Первая картинка, которую модель сможет прочитать.

  Раньше вложения не отправлялись вовсе, и заявка «мошенническая схема, на
  скриншоте» приходила к модели одной этой фразой — без скриншота. Модель
  честно отвечала, что содержимое ей не показали, и это был правильный ответ
  на неправильно заданный вопрос.

  Видео не берём: сервис разбирает картинки, а речь из видео вытаскивается
  другим путём и только по ссылке. Слишком большой файл тоже пропускаем —
  base64 раздувает его ещё на треть, и запрос упрётся в предел раньше, чем
  принесёт пользу.
*/
const IMAGE_FOR_MODEL_BYTES = 4 * 1024 * 1024;

async function readableImage(
  files: File[],
): Promise<{ base64: string; mime: string } | undefined> {
  const image = files.find(
    (file) =>
      ruleFor(file.type)?.kind === ATTACHMENT_KIND.IMAGE &&
      file.size <= IMAGE_FOR_MODEL_BYTES,
  );
  if (!image) return undefined;

  const bytes = Buffer.from(await image.arrayBuffer());
  return { base64: bytes.toString("base64"), mime: image.type };
}

export type Accepted = { ok: true; id: number; publicId: string; receiptToken: string };

export type Rejected =
  | { ok: false; field: "typeSlug"; error: "typeRequired" }
  | { ok: false; field: "files"; error: FileError };

/**
 * Принимает проверенное сообщение: оценка, вложения, номер, журнал.
 *
 * Бросает только на сбое базы. Что можно поправить человеку — неизвестный
 * вид, не те файлы — возвращается ключом ошибки.
 */
export async function acceptReport({
  data,
  form,
  authorId,
  channel = REPORT_CHANNEL.SITE,
}: {
  data: ReportInput;
  /** Форма целиком — из неё берутся файлы поля files. */
  form: FormData;
  authorId: number | null;
  channel?: ReportChannel;
}): Promise<Accepted | Rejected> {
  // Вид приходит из формы и может быть подменён. Сверяем с базой.
  const type = await db.violationType.findUnique({
    where: { slug: data.typeSlug },
    select: { id: true },
  });
  if (!type) return { ok: false, field: "typeSlug", error: "typeRequired" };

  // Предварительная оценка снимается сразу: она ничего не решает, но
  // задаёт порядок в очереди на проверку.
  const run = await assess({
    story: data.story,
    chosenType: data.typeSlug as ViolationSlug,
    hasLink: Boolean(data.link),
    link: data.link || undefined,
    // Читаем прямо из формы, не дожидаясь записи в хранилище: байты уже здесь,
    // а лишний круг через диск ничего не добавляет.
    image: await readableImage(filesFrom(form, "files")),
  });
  const assessment = run.assessment;

  const fields = {
    authorId,
    channel,
    violationTypeId: type.id,
    mediaLink: data.link ? data.link : null,
    authorComment: data.story,
    city: data.city ? data.city : null,
    regionCode: data.regionCode ? data.regionCode : null,

    // Когда произошло. Пусто в форме — значит сегодня: поле подставлено
    // сегодняшним числом, и не тронуть его — это ответ, а не молчание.
    happenedAt: asDate(data.happenedAt || today()),
    // Публикуется сообщение только после проверки живым человеком.
    status: REPORT_STATUS.PENDING,

    // Черновик заголовка от модели. Проверяющий его правит перед публикацией.
    headline: assessment.details?.headline ?? null,

    aiVerdict: assessment.verdict,
    aiConfidence: assessment.confidence,
    // У модели обоснование словами, у словаря — перечень примет.
    aiSummary: assessment.details?.explanation || assessment.reasons.join(","),
    aiSource: assessment.source,
    aiCheckedAt: new Date(),
    // Ответ по каждому виду отдельно — из него собирается вывод для
    // заявителя. У разбора по словам такого нет, там остаётся пусто.
    aiTypeChecks: assessment.details?.checks
      ? JSON.stringify(assessment.details.checks)
      : null,
    // Что модель списала с картинки. Без этого вердикт по снимку нечем
    // проверить: проверяющий видит вывод и не видит, из чего он сделан.
    aiExtractedText: assessment.details?.extractedText || null,
    // Рекомендация по терминологии. Не часть вердикта — своя колонка.
    aiTerminology: assessment.details?.terminology || null,
    // По чему судили. Заявителю это говорят на странице прямым текстом.
    aiBasis: run.basis,
    // Личный ключ страницы «принято». Случайный, потому что номер
    // MM-2026-0001 угадывается с первой попытки.
    receiptToken: randomUUID(),
  };

  // Файлы кладём в хранилище до записи: сообщение без снимка ещё можно
  // рассмотреть, а запись со ссылкой на непоявившийся файл — уже нет.
  const files = await prepare(filesFrom(form, "files"));
  if (!files.ok) return { ok: false, field: "files", error: files.error };

  let report: { id: number; publicId: string };

  // Три попытки на случай, если номер займут между запросом и вставкой.
  try {
    report = await createReport(fields);
  } catch (error) {
    // Сообщения не будет — значит и файлам лежать не за чем.
    await discard(files.items);
    throw error;
  }

  await attachTo(report.id, files.items);
  await recordCheck(report.id, run, data.typeSlug);

  // Разбор модель пишет по-английски — переводы на языки сайта готовим уже
  // после ответа, чтобы заявитель не ждал лишнего. Страница «принято»
  // переведёт сама, если откроется раньше.
  after(() => warmReport(report.id));

  return { ok: true, ...report, receiptToken: fields.receiptToken };
}
