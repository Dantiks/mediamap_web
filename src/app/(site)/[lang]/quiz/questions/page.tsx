import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import PanelQuiz from "@/components/quiz/PanelQuiz";
import { isReadyLanguage } from "@/lib/i18n";
import { getContent } from "@/server/content";
import { loadQuiz } from "@/server/quiz";

/*
  «Проверь себя»: тест из вопросов, которые редакция заводит в панели.

  Своя страница рядом с шестью учебными тестами. Вопросов нет — страницы
  тоже нет: в списке тестов на неё в этом случае и не ведёт ничего.
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
  return { title: dict.quizPage.panel.title, description: dict.quizPage.panel.lead };
}

export default async function PanelQuizPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { lang } = await params;
  if (!isReadyLanguage(lang)) notFound();

  const questions = await loadQuiz(lang);
  if (questions.length === 0) notFound();

  const dict = await getContent(lang);
  const words = dict.quizPage;

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6 lg:px-10">
      <div className="max-w-3xl">
        <Link
          href={`/${lang}/quiz`}
          className="inline-flex min-h-11 items-center gap-1.5 py-2 text-sm text-signal hover:underline"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {words.back}
        </Link>

        <h1 className="mt-4 text-3xl sm:text-4xl">{words.panel.title}</h1>
        <p className="mt-4 text-lg text-muted">{words.panel.lead}</p>

        <PanelQuiz dict={dict} questions={questions} />
      </div>
    </div>
  );
}
