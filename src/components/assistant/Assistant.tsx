"use client";

import { Fragment, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, MessageCircle, RotateCcw, SendHorizontal, Square, X } from "lucide-react";

import { MAX_QUESTION } from "@/lib/assistant";
import type { Dictionary, Lang } from "@/lib/i18n";

/*
  Ассистент: кнопка в углу и окно разговора.

  Подключается в макете одной строкой и только когда включён на сервере —
  без ключа кнопки нет вовсе (см. src/server/assistant/config.ts).

  Разговор живёт в памяти этой вкладки и больше нигде: ни localStorage, ни
  cookie. Переходы по сайту его не сбрасывают — макет при них остаётся на
  месте, — а закрытая вкладка забирает его с собой. Так и обещано в окне:
  «разговор не сохраняется».

  На телефоне кнопка — круглый значок без подписи, чтобы не закрывать
  содержимое, а на самой форме подачи её нет: там она легла бы на кнопку
  «Отправить», а помогать человеку, который уже заполняет форму, поздно.
  Окно на телефоне занимает весь экран: в маленьком окошке поверх страницы
  с клавиатурой снизу не помещается ни вопрос, ни ответ.
*/

type Message = { role: "user" | "assistant"; content: string };

type Failure = { code: string; seconds?: number };

export default function Assistant({
  lang,
  words,
}: {
  lang: Lang;
  words: Dictionary["assistant"];
}) {
  const pathname = usePathname();
  const panelId = useId();
  const titleId = useId();

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<Failure | null>(null);

  const launcher = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const log = useRef<HTMLDivElement>(null);
  const abort = useRef<AbortController | null>(null);
  const returnFocus = useRef(false);

  const onReportForm = pathname === `/${lang}/report`;

  // Открыли — фокус в поле вопроса. Закрыли — обратно на кнопку, а не в
  // начало страницы: человек, идущий клавиатурой, иначе теряет место.
  useEffect(() => {
    if (open) input.current?.focus();
    else if (returnFocus.current) launcher.current?.focus();
    returnFocus.current = false;
  }, [open]);

  // Новый кусок ответа — прокрутка вниз, чтобы читать не вслепую.
  useEffect(() => {
    log.current?.scrollTo({ top: log.current.scrollHeight });
  }, [messages, failure]);

  // Окно закрыли посреди ответа — дальше его никто не прочтёт.
  useEffect(() => () => abort.current?.abort(), []);

  const close = () => {
    returnFocus.current = true;
    setOpen(false);
  };

  // Переход по ссылке из окна. На телефоне окно закрывает всю страницу,
  // и без этого человек не увидел бы, куда пришёл; на большом экране оно
  // сбоку и не мешает — пусть остаётся.
  const follow = () => {
    if (window.matchMedia("(max-width: 639px)").matches) setOpen(false);
  };

  const ask = async (text: string) => {
    const question = text.trim().slice(0, MAX_QUESTION);
    if (!question || pending) return;

    const history: Message[] = [...messages, { role: "user", content: question }];
    setMessages([...history, { role: "assistant", content: "" }]);
    setDraft("");
    setFailure(null);
    setPending(true);

    const controller = new AbortController();
    abort.current = controller;

    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lang, messages: history }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        const data = (await response.json().catch(() => null)) as
          | { error?: string; seconds?: number }
          | null;
        throw { code: data?.error ?? "failed", seconds: data?.seconds } satisfies Failure;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let answer = "";

      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        answer += decoder.decode(value, { stream: true });
        setMessages([...history, { role: "assistant", content: answer }]);
      }

      if (!answer.trim()) throw { code: "failed" } satisfies Failure;
    } catch (error) {
      if (controller.signal.aborted) {
        // Остановили сами: что успело прийти — остаётся, пустое — убираем.
        setMessages((current) => current.filter((message) => message.content));
      } else {
        // Вопрос не пропадает: возвращаем его в поле, ответ-заготовку убираем.
        setMessages(history.slice(0, -1));
        setDraft(question);
        setFailure(
          typeof error === "object" && error && "code" in error
            ? (error as Failure)
            : { code: "failed" },
        );
      }
    } finally {
      setPending(false);
      abort.current = null;
    }
  };

  const restart = () => {
    abort.current?.abort();
    setMessages([]);
    setFailure(null);
    setDraft("");
    input.current?.focus();
  };

  const errorText = (failure: Failure) => {
    const known = words.errors as Record<string, string>;
    return (known[failure.code] ?? words.errors.failed).replace("{n}", String(failure.seconds ?? 30));
  };

  if (!open) {
    return (
      <button
        ref={launcher}
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={false}
        aria-controls={panelId}
        title={words.openLabel}
        /* z-40: ниже окна «Отправляем…» (z-50) и шапки (z-100). Отступ от
           края учитывает вырез и полосу жестов на телефоне. */
        className={`fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-40 flex h-12 w-12 items-center justify-center gap-2 rounded-full bg-deep text-surface shadow-lg transition-colors hover:bg-ink sm:w-auto sm:rounded-xs sm:px-4 ${
          onReportForm ? "max-sm:hidden" : ""
        }`}
      >
        <MessageCircle className="h-5 w-5" aria-hidden="true" />
        <span className="sr-only sm:not-sr-only sm:text-sm sm:font-medium">{words.open}</span>
      </button>
    );
  }

  const streaming = pending && messages.at(-1)?.content === "";

  return (
    <section
      id={panelId}
      role="dialog"
      aria-labelledby={titleId}
      onKeyDown={(event) => {
        if (event.key === "Escape") close();
      }}
      /* Над шапкой (z-100): на телефоне окно во весь экран и закрывает её. */
      className="fixed inset-0 z-[150] flex flex-col bg-paper sm:inset-auto sm:right-4 sm:bottom-4 sm:h-[min(640px,calc(100dvh-2rem))] sm:w-[400px] sm:border sm:border-line sm:shadow-lg"
    >
      <header className="flex items-center gap-2 border-b border-line py-2 pr-2 pl-4">
        <h2 id={titleId} className="flex-1 text-base">
          {words.title}
        </h2>
        {messages.length > 0 ? (
          <button
            type="button"
            onClick={restart}
            title={words.clear}
            className="flex h-11 w-11 items-center justify-center rounded-xs text-muted transition-colors hover:bg-surface hover:text-ink"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">{words.clear}</span>
          </button>
        ) : null}
        <button
          type="button"
          onClick={close}
          title={words.close}
          className="flex h-11 w-11 items-center justify-center rounded-xs text-muted transition-colors hover:bg-surface hover:text-ink"
        >
          <X className="h-5 w-5" aria-hidden="true" />
          <span className="sr-only">{words.close}</span>
        </button>
      </header>

      <div
        ref={log}
        role="log"
        aria-live="polite"
        // Пока ответ идёт, читалка ждёт: иначе она зачитывала бы каждый кусок.
        aria-busy={pending}
        className="flex-1 space-y-4 overflow-y-auto px-4 py-4"
      >
        <p className="text-sm">{words.intro}</p>
        <p className="border-l-2 border-line pl-3 text-xs text-muted">{words.caution}</p>

        {messages.length === 0 ? (
          <ul className="flex flex-wrap gap-2">
            {words.suggestions.map((suggestion) => (
              <li key={suggestion}>
                <button
                  type="button"
                  onClick={() => ask(suggestion)}
                  className="min-h-11 rounded-xs border border-border bg-surface px-3 py-2 text-left text-sm transition-colors hover:border-ink"
                >
                  {suggestion}
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        {messages.map((message, index) =>
          message.role === "user" ? (
            <div key={index} className="ml-8 rounded-xs border border-line bg-surface px-3 py-2 text-sm">
              <span className="sr-only">{words.you}: </span>
              <span className="whitespace-pre-wrap">{message.content}</span>
            </div>
          ) : (
            <div key={index} className="mr-4 text-sm">
              <span className="sr-only">{words.bot}: </span>
              {message.content ? (
                <span className="whitespace-pre-wrap">
                  <Answer text={message.content} onFollow={follow} />
                </span>
              ) : (
                <span className="text-muted">{words.thinking}</span>
              )}
            </div>
          ),
        )}

        {failure ? (
          <p role="alert" className="text-sm text-signal">
            {errorText(failure)}
          </p>
        ) : null}
      </div>

      <div className="border-t border-line px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {!onReportForm ? (
          <Link
            href={`/${lang}/report`}
            onClick={follow}
            className="mb-3 inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-signal hover:text-signal-deep"
          >
            {words.toReport}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        ) : null}

        <form
          onSubmit={(event) => {
            event.preventDefault();
            ask(draft);
          }}
          className="flex items-end gap-2"
        >
          <label className="flex-1">
            <span className="sr-only">{words.placeholder}</span>
            <textarea
              ref={input}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                // Enter — отправить, Shift+Enter — новая строка. Пока идёт
                // набор через IME, Enter выбирает слово, а не отправляет.
                if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  ask(draft);
                }
              }}
              maxLength={MAX_QUESTION}
              rows={2}
              placeholder={words.placeholder}
              // 16px: мельче iOS при фокусе увеличивает страницу.
              className="block max-h-40 min-h-12 w-full resize-none rounded-xs border border-border bg-surface px-3 py-2 text-base"
            />
          </label>

          {pending ? (
            <button
              type="button"
              onClick={() => abort.current?.abort()}
              title={words.stop}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xs border border-border bg-surface transition-colors hover:border-ink"
            >
              <Square className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">{words.stop}</span>
            </button>
          ) : (
            <button
              type="submit"
              disabled={!draft.trim()}
              title={words.send}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xs bg-signal text-surface transition-colors hover:bg-signal-deep disabled:opacity-40"
            >
              <SendHorizontal className="h-5 w-5" aria-hidden="true" />
              <span className="sr-only">{words.send}</span>
            </button>
          )}
        </form>

        {draft.length > MAX_QUESTION - 200 ? (
          <p className="mt-1 text-2xs text-muted">
            {words.left.replace("{n}", String(MAX_QUESTION - draft.length))}
          </p>
        ) : null}
        {streaming ? <span className="sr-only">{words.thinking}</span> : null}
      </div>
    </section>
  );
}

/*
  Ответ модели — простым текстом, и ссылками становятся только пути этого
  сайта: /ru/report, /ky/types/hate-speech. Чужие адреса остаются текстом.

  Это защита, а не упрощение. Модель можно уговорить написать что угодно,
  в том числе адрес поддельного банка; кликабельным его делать нельзя —
  кнопка на нашем сайте выглядит как наша рекомендация.
*/
const SITE_PATH = /(^|[\s(«"])(\/(?:ky|ru|en)(?:\/[\w\-/]*[\w\-])?)(?=$|[\s).,;:!?»"])/g;

function Answer({ text, onFollow }: { text: string; onFollow: () => void }) {
  // Жирный модель иногда ставит вопреки просьбе — звёздочки только мешают.
  const clean = text.replace(/\*\*/g, "");
  const parts: React.ReactNode[] = [];
  let last = 0;

  for (const match of clean.matchAll(SITE_PATH)) {
    const [, before, path] = match;
    const start = (match.index ?? 0) + before.length;
    parts.push(clean.slice(last, start));
    parts.push(
      <Link
        key={start}
        href={path}
        onClick={onFollow}
        className="text-signal underline underline-offset-2 hover:text-signal-deep"
      >
        {path}
      </Link>,
    );
    last = start + path.length;
  }
  parts.push(clean.slice(last));

  return (
    <>
      {parts.map((part, index) => (
        <Fragment key={index}>{part}</Fragment>
      ))}
    </>
  );
}
