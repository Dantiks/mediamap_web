import { NextResponse } from "next/server";
import { z } from "zod";

import { MAX_QUESTION } from "@/lib/assistant";
import { READY_LANGUAGES } from "@/lib/i18n";
import { assistantEnabled, assistantHourlyCap } from "@/server/assistant/config";
import { openChatStream } from "@/server/assistant/chat";
import { findMaterials } from "@/server/assistant/materials";
import { buildSystemPrompt } from "@/server/assistant/prompt";
import { getContent } from "@/server/content";
import { takeAssistantSlot } from "@/server/rate-limit";

/*
  Ассистент: вопрос посетителя → ответ модели потоком.

  Обработчик, а не серверное действие, по той же причине, что и проверка
  изображения: ответ идёт секунды, а действия делят очередь с переходами по
  сайту. К тому же действие не умеет отдавать поток кусками.

  Разговор нигде не хранится. История живёт в браузере, пока открыта
  вкладка, и каждый раз приходит целиком; здесь она собирается в запрос и
  забывается. В журнал не пишем ни вопросов, ни ответов — только факт сбоя.
*/

/** Ответы модели короче, но приходят назад от клиента — верим не на слово. */
const MAX_ANSWER = 4000;
/** Сколько последних реплик помним. Старше — модели уже не нужно. */
const MAX_TURNS = 10;
/** Потолок ответа в байтах — на случай, если сервис забудет про max_tokens. */
const MAX_OUTPUT_BYTES = 16_000;

const Body = z.object({
  lang: z.enum(READY_LANGUAGES),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(MAX_ANSWER),
      }),
    )
    .min(1)
    .max(40),
});

const fail = (error: string, status: number, extra: object = {}) =>
  NextResponse.json({ status: "error", error, ...extra }, { status });

/*
  Потолок на весь сайт за час. Счёт в памяти процесса, как и у частоты:
  после перезапуска обнуляется, и это приемлемо — нужен он против
  внезапного напора, а не для отчётности.
*/
let hourStart = 0;
let hourCount = 0;

function takeHourly(): boolean {
  const now = Date.now();
  if (now - hourStart > 60 * 60 * 1000) {
    hourStart = now;
    hourCount = 0;
  }
  if (hourCount >= assistantHourlyCap()) return false;
  hourCount += 1;
  return true;
}

/*
  Запрос только со страниц самого сайта.

  Подделать Origin может любой скрипт вне браузера — это не замок. Но
  чужой сайт не сможет сделать из нашего ассистента бесплатного бота для
  своих посетителей: браузер подставит его адрес, а не наш.
*/
function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/** Управляющие символы и наши служебные теги из текста посетителя. */
const clean = (text: string) =>
  text
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .replace(/<\/?\s*materials\s*>/gi, "");

export async function POST(request: Request): Promise<Response> {
  if (!assistantEnabled()) return fail("off", 503);
  if (!sameOrigin(request)) return fail("forbidden", 403);

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await request.json());
  } catch {
    return fail("bad", 400);
  }

  const messages = body.messages.slice(-MAX_TURNS).map((message) => ({
    role: message.role,
    content: clean(message.content),
  }));

  const question = messages.at(-1);
  if (!question || question.role !== "user") return fail("bad", 400);
  if (question.content.length > MAX_QUESTION) return fail("long", 413);

  // Частота — после разбора тела: битый запрос не должен съедать место в
  // серии человека, а тяжёлой работы до этой строки ещё не было.
  const slot = await takeAssistantSlot();
  if (!slot.ok) return fail("wait", 429, { seconds: slot.seconds });
  if (!takeHourly()) return fail("busy", 503);

  const [dict, materials] = await Promise.all([
    getContent(body.lang),
    findMaterials(question.content, body.lang).catch(() => ({ cases: [], news: [] })),
  ]);
  const system = buildSystemPrompt(dict, body.lang, materials);

  let upstream: ReadableStream<Uint8Array>;
  try {
    upstream = await openChatStream(system, messages, request.signal);
  } catch (error) {
    // Только причина сбоя — без вопроса и без ответа.
    console.error("ассистент: ML-сервис не ответил:", (error as Error).message);
    return fail("failed", 502);
  }

  let sent = 0;
  const capped = upstream.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        if (sent >= MAX_OUTPUT_BYTES) return controller.terminate();
        sent += chunk.byteLength;
        controller.enqueue(chunk);
      },
    }),
  );

  return new Response(capped, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      // Иначе прокси может копить ответ целиком, и поток превратится в паузу.
      "X-Accel-Buffering": "no",
    },
  });
}
