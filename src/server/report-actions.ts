"use server";

import { redirect } from "next/navigation";

import { currentUser } from "@/lib/auth";
import { acceptReport, parseReportForm } from "./report-intake";
import { takeSubmitSlot } from "./rate-limit";

// Приём сообщения о нарушении с формы на сайте. Сама запись — проверка вида,
// оценка, номер, вложения — в report-intake.ts: ей же пользуется Telegram-бот.

// Успеха здесь нет: после записи уводим на отдельную страницу. Экран
// «принято» — это своя страница со своим адресом, а не другое состояние
// формы: его можно сохранить в закладки и вернуться позже за решением.
export type SubmitState =
  | { status: "idle" }
  | { status: "error"; errors: Record<string, string>; values: Record<string, string> };

/** Ошибка, которая относится ко всей форме, а не к какому-то полю. */
const wholeForm = (message: string, form: FormData): SubmitState => ({
  status: "error",
  errors: { form: message },
  values: submitted(form),
});

const KEEP_ON_ERROR = [
  "typeSlug",
  "link",
  "story",
  "city",
  "regionCode",
  "happenedAt",
] as const;

/** Что вернуть в форму, чтобы человек не набирал всё заново. */
const submitted = (form: FormData): Record<string, string> =>
  Object.fromEntries(
    KEEP_ON_ERROR.map((field) => [field, String(form.get(field) ?? "")]),
  );

export async function submitReport(
  _previous: SubmitState,
  form: FormData,
): Promise<SubmitState> {
  // Язык нужен, чтобы увести на страницу «принято» на том же языке.
  const lang = String(form.get("lang") ?? "ru");

  const parsed = parseReportForm(form);
  if (!parsed.ok) {
    return { status: "error", errors: parsed.errors, values: submitted(form) };
  }

  /*
    Частоту считаем ПОСЛЕ проверки полей, а не до.

    Раньше было наоборот — чтобы не разбирать сорок мегабайт вложений ради
    отказа. Но теперь пауза наступает уже на четвёртой отправке, и человек,
    дважды промахнувшийся мимо обязательного поля, тратил бы на опечатки те
    же попытки, что и спамер. Файлы всё равно разбираются ниже, после этой
    проверки, так что лишней работы не прибавилось.
  */
  const slot = await takeSubmitSlot();
  if (!slot.ok) {
    return wholeForm(`tooOften:${slot.seconds}`, form);
  }

  /*
    Кто подал, если человек был в аккаунте.

    Не проставлялось вовсе — и аккаунт получался бесполезным: сообщения
    привязывались только к браузеру, а страница «История» у вошедшего всегда
    была пуста, хотя он подавал их сам и только что.

    Анонимности это не отменяет: у не вошедшего остаётся null, и это по-
    прежнему основной путь.
  */
  const author = await currentUser();

  const result = await acceptReport({
    data: parsed.data,
    form,
    authorId: author?.id ?? null,
  });

  if (!result.ok) {
    return {
      status: "error",
      errors: { [result.field]: result.error },
      values: submitted(form),
    };
  }

  // redirect бросает своё исключение, поэтому вызываем его последним:
  // раньше его перехватила бы проверка на дубль номера.
  redirect(`/${lang}/report/sent/${result.receiptToken}`);
}
