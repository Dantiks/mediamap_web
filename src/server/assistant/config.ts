import { mlServiceUrl } from "@/server/ml-service";

/*
  Включён ли ассистент.

  Нужны обе вещи: адрес ML-сервиса и явное «да». Одного адреса мало —
  ML_SERVICE_URL стоит почти везде ради разбора сообщений, а эндпоинт
  /chat в сервисе может быть ещё не поднят. Кнопка, которая на каждый
  вопрос отвечает «недоступно», хуже, чем никакой.
*/
export function assistantEnabled(): boolean {
  return process.env.ASSISTANT_ENABLED === "1" && mlServiceUrl().length > 0;
}

/** Ответ начинается за секунды, но длинный может идти и полминуты. */
export function assistantTimeoutMs(): number {
  const raw = Number(process.env.ASSISTANT_TIMEOUT_MS);
  return Number.isFinite(raw) && raw > 0 ? raw : 30_000;
}

/**
 * Сколько вопросов в час принимает весь сайт.
 *
 * Счётчик частоты держит одного человека, но не сотню адресов разом, а
 * платим мы за каждый. Потолок — последняя страховка счёта за модель:
 * дошли до него — ассистент честно говорит «попробуйте позже».
 */
export function assistantHourlyCap(): number {
  const raw = Number(process.env.ASSISTANT_HOURLY_CAP);
  return Number.isFinite(raw) && raw > 0 ? raw : 300;
}
