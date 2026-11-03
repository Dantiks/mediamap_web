"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, RotateCcw, X } from "lucide-react";

import type { Dictionary } from "@/lib/i18n";
import type { QuizQuestion } from "@/lib/quiz";
import { questionParts } from "@/lib/quiz/parts";

/*
  Прохождение теста — «разбор публикации».

  Одно задание на экране: слева ситуация карточкой публикации, справа
  вопрос и варианты. Так тест похож на работу мониторщика — смотришь на
  пост и решаешь, что это. Вариант выбрали в редакции из шести эскизов.

  Ответ даётся один раз. Переключиться на другой вариант после пояснения —
  значит просто списать правильный, и балл перестаёт что-либо значить.
  Варианты при этом не выключаются атрибутом disabled: выключенная кнопка
  теряет фокус, и человек с клавиатуры после ответа оказывался бы в начале
  страницы. Повторный выбор просто ничего не меняет.

  Верно или нет — говорим словом и значком, а не только цветом. Полоска
  прогресса тоже цветная, поэтому рядом всегда стоит «Задание 3 из 7».

  При переходе к другому заданию фокус ставим на его вопрос: иначе экранный
  диктор молчит, а человек с клавиатуры остаётся на кнопке, которой уже нет.
*/

type Words = Dictionary["quizPage"];

const LETTERS = ["A", "B", "C", "D", "E", "F"];

const situationLine = (text: string) => {
  const parts = questionParts(text);
  return parts.quote ?? (parts.situation || parts.question);
};

const fill = (template: string, values: Record<string, number>) =>
  Object.entries(values).reduce(
    (text, [key, value]) => text.replace(`{${key}}`, String(value)),
    template,
  );

export function Quiz({
  questions,
  words,
  nextHref,
  allHref,
}: {
  questions: QuizQuestion[];
  words: Words;
  nextHref: string | null;
  allHref: string;
}) {
  const [answers, setAnswers] = useState<(number | null)[]>(() =>
    questions.map(() => null),
  );
  const [current, setCurrent] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);
  const focusRef = useRef<HTMLElement | null>(null);
  const setFocus = (node: HTMLElement | null) => {
    focusRef.current = node;
  };
  const moved = useRef(false);

  const total = questions.length;
  const done = answers.filter((answer) => answer !== null).length;
  const score = answers.filter((answer, index) => answer === questions[index].answer).length;

  useEffect(() => {
    if (!moved.current) return;
    moved.current = false;
    topRef.current?.scrollIntoView({ block: "start" });
    focusRef.current?.focus({ preventScroll: true });
  }, [current, showResult]);

  const go = (index: number) => {
    moved.current = true;
    setShowResult(false);
    setCurrent(index);
  };

  const finish = () => {
    moved.current = true;
    setShowResult(true);
  };

  const choose = (option: number) => {
    setAnswers((list) =>
      list[current] !== null
        ? list
        : list.map((answer, index) => (index === current ? option : answer)),
    );
  };

  const retry = () => {
    setAnswers(questions.map(() => null));
    go(0);
  };

  const progress = (
    <div ref={topRef} className="scroll-mt-24">
      <div className="flex gap-1" aria-hidden="true">
        {questions.map((question, index) => {
          const answer = answers[index];
          const tone =
            answer === null
              ? index === current && !showResult
                ? "bg-ink"
                : "bg-line"
              : answer === question.answer
                ? "bg-trust-high"
                : "bg-signal";
          return <span key={question.text} className={`h-1.5 flex-1 rounded-xs ${tone}`} />;
        })}
      </div>
      <p className="mt-2.5 text-sm text-muted">
        {showResult
          ? fill(words.progress, { done, total })
          : fill(words.questionLabel, { n: current + 1, total })}
      </p>
    </div>
  );

  if (showResult) {
    return (
      <div className="mt-10">
        {progress}

        <section className="mt-10 grid gap-10 lg:grid-cols-2 lg:gap-16" aria-live="polite">
          <div>
            <h2
              ref={setFocus}
              tabIndex={-1}
              className="text-2xl outline-none"
            >
              {words.resultTitle}
            </h2>
            <p className="mt-3 font-display text-5xl font-medium" data-testid="quiz-score">
              {fill(words.result, { score, total })}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={nextHref ?? allHref}
                className="inline-flex h-12 items-center gap-2 rounded-xs bg-signal px-6 text-base font-medium text-surface transition-colors hover:bg-signal-deep"
              >
                {nextHref ? words.next : words.back}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <button
                type="button"
                onClick={retry}
                className="inline-flex h-12 items-center gap-2 rounded-xs border border-border px-6 text-base font-medium transition-colors hover:bg-surface"
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                {words.retry}
              </button>
            </div>
          </div>

          <div>
            <p className="text-muted">{words.resultBody}</p>
            <ol className="mt-4 border-t border-line">
              {questions.map((question, index) => {
                const right = answers[index] === question.answer;
                return (
                  <li key={question.text} className="border-b border-line">
                    <button
                      type="button"
                      onClick={() => go(index)}
                      className="flex min-h-14 w-full items-center gap-4 py-3 text-left transition-colors hover:bg-surface"
                    >
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xs text-surface ${
                          right ? "bg-trust-high" : "bg-signal"
                        }`}
                      >
                        {right ? (
                          <Check className="h-4 w-4" aria-label={words.correct} />
                        ) : (
                          <X className="h-4 w-4" aria-label={words.wrong} />
                        )}
                      </span>
                      <span className="flex-1">
                        <span className="block text-sm text-muted">
                          {fill(words.questionLabel, { n: index + 1, total })}
                        </span>
                        {/* Вопросы в тестах похожи друг на друга («Как это оценить?»),
                            узнают задание по ситуации. */}
                        <span className="line-clamp-1">{situationLine(question.text)}</span>
                      </span>
                      <span className="hidden text-sm text-signal sm:inline">{words.review}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>
      </div>
    );
  }

  const question = questions[current];
  const parts = questionParts(question.text);
  const chosen = answers[current];
  const answered = chosen !== null;
  const right = chosen === question.answer;
  const name = `q${current}`;

  return (
    <div className="mt-10">
      {progress}

      <div className="mt-8 grid items-start gap-8 lg:grid-cols-2 lg:gap-16">
        {parts.situation ? (
          <div>
            <figure className="rounded-xs border border-line bg-surface p-6 sm:p-7">
              <p className="eyebrow">{words.situation}</p>
              {parts.quote ? (
                <>
                  <p className="mt-4 text-muted">{parts.lead}</p>
                  <blockquote className="mt-2 font-display text-2xl leading-snug text-ink">
                    {parts.quote}
                  </blockquote>
                </>
              ) : (
                <p className="mt-4 font-display text-xl leading-relaxed text-ink">
                  {parts.situation}
                </p>
              )}
              <figcaption className="eyebrow mt-6 border-t border-line pt-3">
                {words.reconstruction}
              </figcaption>
            </figure>

            <div className="mt-4 hidden rounded-xs border border-line p-6 lg:block">
              <p className="eyebrow">{words.lookFor}</p>
              <p className="mt-2 text-muted">{words.lookForBody}</p>
            </div>
          </div>
        ) : null}

        <fieldset key={current} className={parts.situation ? "" : "lg:col-span-2 lg:max-w-3xl"}>
          <legend
            ref={setFocus}
            tabIndex={-1}
            className="font-display text-2xl font-medium text-ink outline-none"
          >
            {parts.question}
          </legend>

          <div className="mt-6 space-y-2.5">
            {question.options.map((option, index) => {
              const isAnswer = index === question.answer;
              const isChosen = index === chosen;
              const tone = !answered
                ? "border-line hover:border-border"
                : isAnswer
                  ? "border-trust-high bg-trust-high/10"
                  : isChosen
                    ? "border-signal bg-signal/10"
                    : "border-line text-muted";
              const letter = !answered
                ? "border-border bg-surface"
                : isAnswer
                  ? "border-trust-high bg-trust-high text-surface"
                  : isChosen
                    ? "border-signal bg-signal text-surface"
                    : "border-line bg-surface";

              return (
                <label
                  key={option}
                  className={`flex min-h-12 items-start gap-3 rounded-xs border bg-surface px-4 py-3 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-signal ${tone} ${answered ? "cursor-default" : "cursor-pointer"}`}
                >
                  <input
                    type="radio"
                    name={name}
                    value={index}
                    checked={isChosen}
                    onChange={() => choose(index)}
                    aria-describedby={answered ? `${name}-result` : undefined}
                    className="sr-only"
                  />
                  <span
                    aria-hidden="true"
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xs border font-mono text-sm ${letter}`}
                  >
                    {LETTERS[index]}
                  </span>
                  <span className="flex-1 pt-0.5">{option}</span>
                  {answered && isAnswer ? (
                    <Check
                      className="mt-1 h-5 w-5 shrink-0 text-trust-high"
                      aria-label={words.correct}
                    />
                  ) : null}
                  {answered && isChosen && !isAnswer ? (
                    <X className="mt-1 h-5 w-5 shrink-0 text-signal" aria-label={words.wrong} />
                  ) : null}
                </label>
              );
            })}
          </div>

          {/* Область объявлений живёт всегда: экранный диктор читает
              вставленный в неё текст, а не появившийся вместе с ней. */}
          <div id={`${name}-result`} role="status" className="mt-5">
            {answered ? (
              <div className={`border-l-4 py-1 pl-4 ${right ? "border-trust-high" : "border-signal"}`}>
                <p className={`font-medium ${right ? "text-trust-high" : "text-signal"}`}>
                  {right ? words.correct : words.wrong}
                </p>
                {right ? null : (
                  <p className="mt-1">
                    {words.rightAnswer} {question.options[question.answer]}
                  </p>
                )}
                <p className="mt-1 text-muted">
                  {words.why} {question.why}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted">{words.answerOnce}</p>
            )}
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            {current > 0 ? (
              <button
                type="button"
                onClick={() => go(current - 1)}
                className="inline-flex h-12 items-center gap-2 px-2 text-base text-muted transition-colors hover:text-ink"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                {words.previousQuestion}
              </button>
            ) : (
              <span />
            )}

            {answered ? (
              <button
                type="button"
                onClick={() => {
                  // К первому непройденному после этого: вернувшись к разбору
                  // третьего задания, человек едет дальше туда, где остановился.
                  if (done === total) return finish();
                  const after = answers.findIndex((answer, index) => answer === null && index > current);
                  go(after !== -1 ? after : answers.indexOf(null));
                }}
                className="inline-flex h-12 items-center gap-2 rounded-xs bg-signal px-6 text-base font-medium text-surface transition-colors hover:bg-signal-deep"
              >
                {done === total ? words.showResult : words.nextQuestion}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            ) : null}
          </div>
        </fieldset>
      </div>
    </div>
  );
}
