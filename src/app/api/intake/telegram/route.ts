import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

import { REPORT_CHANNEL } from "@/lib/enums";
import { decide, fresh, type Limits, type Record as Budget } from "@/server/rate-limit";
import { acceptReport, parseReportForm } from "@/server/report-intake";

/*
  Приём сообщений от Telegram-бота.

  Бот живёт в соседнем репозитории (media-map-backend) и работает на той же
  машине, что и сайт. Сюда он шлёт то же, что форма на сайте, — те же поля
  и файлы в поле files, — и сообщение проходит тот же путь: проверка, номер,
  оценка, вложения. Отличается только канал и то, что ответ — JSON с
  номером и ссылкой на страницу «принято», а не переадресация.

  Обработчик закрыт трижды:
    * без BOT_INTAKE_SECRET в окружении его нет вовсе — 404;
    * запрос должен нести этот секрет в Authorization;
    * отправитель должен быть самой машиной. Адрес берём из
      X-Forwarded-For: Caddy пишет туда настоящий адрес клиента поверх
      присланного, а при прямом запросе на 127.0.0.1:3000 Next ставит туда
      адрес сокета сам. Снаружи этот путь вдобавок закрыт в Caddyfile.

  Заявитель анонимен: бот не передаёт ни номер чата, ни имя. Сайт обещает
  анонимность, и Telegram-аккаунт в базе был бы ровно тем, чего мы
  обещали не держать.
*/

/*
  Частоту по человеку считает сам бот — по чату, тем же правилом, что
  форма. Здесь все сообщения приходят с одного адреса, и счёт по адресу
  закрыл бы бот для всех разом. Этот предел — общий и щедрый: на случай,
  если секрет утечёт или бот сойдёт с ума, а не для людей.
*/
const LIMITS: Limits = {
  burst: 60,
  windowMs: 5 * 60 * 1000,
  pausesMs: [60 * 1000, 5 * 60 * 1000, 15 * 60 * 1000],
  forgiveMs: 30 * 60 * 1000,
};

let budget: Budget = fresh();

const LANGS = new Set(["ru", "ky", "en"]);

const json = (body: object, status = 200) => NextResponse.json(body, { status });

/** Сравнение без утечки по времени. Отпечатки — чтобы длины совпадали всегда. */
function sameSecret(given: string, expected: string): boolean {
  const a = createHash("sha256").update(given).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

const LOOPBACK = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1"]);

function fromThisMachine(request: Request): boolean {
  const first = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
  return LOOPBACK.has(first);
}

export async function POST(request: Request): Promise<NextResponse> {
  const secret = process.env.BOT_INTAKE_SECRET ?? "";
  if (!secret || !fromThisMachine(request)) {
    return json({ status: "error", error: "notFound" }, 404);
  }

  const auth = request.headers.get("authorization") ?? "";
  const given = auth.startsWith("Bearer ") ? auth.slice("Bearer ".length) : "";
  if (!sameSecret(given, secret)) {
    return json({ status: "error", error: "unauthorized" }, 401);
  }

  const { decision, next } = decide(budget, Date.now(), LIMITS);
  budget = next;
  if (!decision.ok) {
    return json({ status: "error", error: "wait", seconds: decision.seconds }, 429);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ status: "error", error: "bad" }, 400);
  }

  const parsed = parseReportForm(form);
  if (!parsed.ok) {
    return json({ status: "error", errors: parsed.errors }, 400);
  }

  const result = await acceptReport({
    data: parsed.data,
    form,
    authorId: null,
    channel: REPORT_CHANNEL.TELEGRAM,
  });

  if (!result.ok) {
    return json({ status: "error", errors: { [result.field]: result.error } }, 400);
  }

  const raw = String(form.get("lang") ?? "ru");
  const lang = LANGS.has(raw) ? raw : "ru";
  const site = (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

  return json({
    status: "ok",
    publicId: result.publicId,
    receiptUrl: `${site}/${lang}/report/sent/${result.receiptToken}`,
  });
}
