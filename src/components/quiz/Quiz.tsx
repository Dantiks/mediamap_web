"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, RotateCcw, X } from "lucide-react";

import type { Dictionary } from "@/lib/i18n";
import type { QuizQuestion } from "@/lib/quiz";

/*
  Прохождение теста.

  Все задания на одной странице, а не по одному: так видно, сколько их, и
  можно вернуться к пояснению к третьему, уже отвечая на шестое.

  Ответ даётся один раз. Переключиться на другой вариант после пояснения —
  значит просто списать правильный, и балл перестаёт что-либо значить.
  Варианты при этом не выключаются атрибутом disabled: выключенная кнопка
  теряет фокус, и человек с клавиатуры после ответа оказывался бы в начале
  страницы. Повторный выбор просто ничего не меняет.

  Верно или нет — говорим словом и значком, а не только цветом.
*/

type Words = Dictionary["quizPage"];

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
  const startRef = useRef<HTMLParagraphElement>(null);

  const done = answers.filter((answer) => answer !== null).length;
  const score = answers.filter((answer, index) => answer === questions[index].answer).length;
  const finished = done === questions.length;

  const choose = (question: number, option: number) => {
    setAnswers((current) =>
      current[question] !== null
        ? current
        : current.map((answer, index) => (index === question ? option : answer)),
    );
  };

  const retry = () => {
    setAnswers(questions.map(() => null));
    startRef.current?.focus();
    startRef.current?.scrollIntoView({ block: "start" });
  };

  return (
    <div className="mt-10">
      <p
        ref={startRef}
        tabIndex={-1}
        className="border-t border-line pt-6 text-sm text-muted outline-none"
      >
        {fill(words.progress, { done, total: questions.length })}
      </p>

      <ol className="mt-6 space-y-10">
        {questions.map((question, index) => {
          const chosen = answers[index];
          const answered = chosen !== null;
          const right = chosen === question.answer;
          const name = `q${index}`;

          return (
            <li key={question.text}>
              <fieldset>
                <legend className="text-lg font-medium">
                  <span className="mb-1 block text-sm font-normal text-muted">
                    {fill(words.questionLabel, { n: index + 1, total: questions.length })}
                  </span>
                  {question.text}
                </legend>

                <div className="mt-4 space-y-2">
                  {question.options.map((option, optionIndex) => {
                    const isAnswer = optionIndex === question.answer;
                    const isChosen = optionIndex === chosen;
                    const tone = !answered
                      ? "border-line hover:border-border"
                      : isAnswer
                        ? "border-trust-high bg-trust-high/10"
                        : isChosen
                          ? "border-signal bg-signal/10"
                          : "border-line";

                    return (
                      <label
                        key={option}
                        className={`flex min-h-12 cursor-pointer items-start gap-3 rounded-xs border bg-surface px-4 py-3 transition-colors ${tone} ${answered ? "cursor-default" : ""}`}
                      >
                        <input
                          type="radio"
                          name={name}
                          value={optionIndex}
                          checked={isChosen}
                          onChange={() => choose(index, optionIndex)}
                          aria-describedby={answered ? `${name}-result` : undefined}
                          className="mt-1 h-4 w-4 shrink-0 accent-signal"
                        />
                        <span className="flex-1">{option}</span>
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
                <div id={`${name}-result`} role="status" className="mt-4">
                  {answered ? (
                    <div
                      className={`border-l-4 py-1 pl-4 ${right ? "border-trust-high" : "border-signal"}`}
                    >
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
                  ) : null}
                </div>
              </fieldset>
            </li>
          );
        })}
      </ol>

      <section className="mt-12 border-t border-line pt-8" aria-live="polite">
        {finished ? (
          <>
            <h2 className="text-2xl">{words.resultTitle}</h2>
            <p className="mt-3 text-4xl font-medium" data-testid="quiz-score">
              {fill(words.result, { score, total: questions.length })}
            </p>
            <p className="mt-3 text-muted">{words.resultBody}</p>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={retry}
                className="inline-flex h-12 items-center gap-2 rounded-xs border border-border px-6 text-base font-medium transition-colors hover:bg-surface"
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                {words.retry}
              </button>
              <Link
                href={nextHref ?? allHref}
                className="inline-flex h-12 items-center gap-2 rounded-xs bg-signal px-6 text-base font-medium text-surface transition-colors hover:bg-signal-deep"
              >
                {nextHref ? words.next : words.back}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </>
        ) : null}
      </section>
    </div>
  );
}
