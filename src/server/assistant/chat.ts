import { mlServiceUrl } from "@/server/ml-service";
import { assistantTimeoutMs } from "./config";

/*
  Разговор с моделью через ML-сервис.

  Ключ OpenAI живёт в сервисе, как и для разбора сообщений: сайт ключа не
  знает и в OpenAI не ходит. Модель выбирает тоже сервис — менять её
  можно, не трогая сайт.

  Договор с сервисом (эндпоинт надо завести в его репозитории):

    POST {ML_SERVICE_URL}/chat
    {
      "system":     "…",                              системная подсказка
      "messages":   [{"role": "user" | "assistant", "content": "…"}],
      "max_tokens": 600,
      "source":     "assistant"
    }

    200 → text/plain; charset=utf-8, ответ модели кусками по мере
          появления (просто дельты текста, без SSE и JSON).
    не 2xx → ошибка; тело не читаем.

  Сервис ничего из разговора не пишет в журнал: вопросы посетителей —
  ровно то, что сайт обещал не хранить.
*/

export type ChatMessage = { role: "user" | "assistant"; content: string };

/** Потолок длины ответа в токенах — на пару абзацев с запасом. */
const MAX_TOKENS = 600;

/**
 * Открывает поток ответа. Бросает, если сервис не ответил или ответил
 * ошибкой, — вызывающий превратит это в понятное «попробуйте позже».
 */
export async function openChatStream(
  system: string,
  messages: ChatMessage[],
  signal: AbortSignal,
): Promise<ReadableStream<Uint8Array>> {
  const base = mlServiceUrl();
  if (!base) throw new Error("ML_SERVICE_URL не задан");

  const response = await fetch(`${base}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ system, messages, max_tokens: MAX_TOKENS, source: "assistant" }),
    // Обрываем и по таймауту, и когда посетитель закрыл окно: дочитывать
    // ответ, который никто не увидит, — платить за пустоту.
    signal: AbortSignal.any([signal, AbortSignal.timeout(assistantTimeoutMs())]),
    cache: "no-store",
  });

  if (!response.ok || !response.body) {
    throw new Error(`ML-сервис ответил ${response.status}`);
  }

  return response.body;
}
