import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";

import { isReadyLanguage } from "@/lib/i18n";
import { quizTests } from "@/lib/quiz";
import { getContent } from "@/server/content";
import { loadQuiz } from "@/server/quiz";

/*
  «Проверь себя»: список тестов.

  Задания — из документа «тесты по распознаванию языка вражды», шесть тестов
  по семь заданий. Каждый тест — своя страница: его можно переслать
  коллеге одной ссылкой, а не «открой и пролистай до четвёртого».

  Седьмой карточкой идёт тест из вопросов, которые редакция заводит в
  панели (/quiz/questions). Пока их нет, карточки нет: обещание теста без
  вопросов читалось бы как поломка.
*/

export const revalidate = 3600;

type Params = { lang: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { lang } = await params;
  if (!isReadyLanguage(lang)) return {};
  const dict = await getContent(lang);
  return { title: dict.quizPage.title, description: dict.quizPage.lead };
}

export default async function QuizPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { lang } = await params;
  if (!isReadyLanguage(lang)) notFound();

  const dict = await getContent(lang);
  const words = dict.quizPage;
  const tests = quizTests(lang);
  const panelQuestions = await loadQuiz(lang);

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6 lg:px-10">
      <div className="max-w-3xl">
        <h1 className="text-3xl sm:text-4xl">{words.title}</h1>
        <p className="mt-4 text-lg text-muted">{words.lead}</p>

        <section className="mt-10 border-t border-line pt-8">
          <h2 className="text-2xl">{words.howTitle}</h2>
          <p className="mt-3 text-muted">{words.howBody}</p>
          {words.sourceNote ? <p className="mt-3">{words.sourceNote}</p> : null}
        </section>

        <section className="mt-10 border-t border-line pt-8">
          <h2 className="text-2xl">{words.testsTitle}</h2>
          <ol className="mt-6 grid gap-px border border-line bg-line sm:grid-cols-2">
            {tests.map((test, index) => (
              <li key={test.slug} className="bg-surface">
                <Link
                  href={`/${lang}/quiz/${test.slug}`}
                  className="flex h-full flex-col gap-2 p-6 transition-colors hover:bg-paper"
                >
                  <span className="text-sm text-muted">
                    {index + 1}.{" "}
                    {words.questionsCount.replace("{count}", String(test.questions.length))}
                  </span>
                  <span className="text-lg font-medium">{test.title}</span>
                  <span className="mt-auto inline-flex items-center gap-1.5 pt-2 text-sm text-signal">
                    {words.start}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </span>
                </Link>
              </li>
            ))}
            {panelQuestions.length > 0 ? (
              <li className="bg-surface">
                <Link
                  href={`/${lang}/quiz/questions`}
                  className="flex h-full flex-col gap-2 p-6 transition-colors hover:bg-paper"
                >
                  <span className="text-sm text-muted">
                    {tests.length + 1}.{" "}
                    {words.questionsCount.replace("{count}", String(panelQuestions.length))}
                  </span>
                  <span className="text-lg font-medium">{words.panel.title}</span>
                  <span className="mt-auto inline-flex items-center gap-1.5 pt-2 text-sm text-signal">
                    {words.start}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </span>
                </Link>
              </li>
            ) : null}
          </ol>
        </section>

        <section className="mt-10 border-t border-line pt-8">
          <h2 className="text-2xl">{words.seeAlsoTitle}</h2>
          <p className="mt-3 text-muted">{words.seeAlsoBody}</p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={`/${lang}/types`}
              className="inline-flex h-12 items-center gap-2 rounded-xs border border-border px-6 text-base font-medium transition-colors hover:bg-surface"
            >
              {words.toTypes}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href={`/${lang}/glossary`}
              className="inline-flex h-12 items-center gap-2 rounded-xs border border-border px-6 text-base font-medium transition-colors hover:bg-surface"
            >
              {words.toGlossary}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </section>

        <p className="mt-10 border-t border-line pt-6 text-sm text-muted">{words.disclaimer}</p>
      </div>
    </div>
  );
}
