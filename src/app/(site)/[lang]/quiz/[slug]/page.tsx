import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { isReadyLanguage } from "@/lib/i18n";
import { quizTest, quizTests } from "@/lib/quiz";
import { getContent } from "@/server/content";
import { Quiz } from "@/components/quiz/Quiz";

// Один тест «Проверь себя». Задания и проверка ответов — в браузере:
// отправлять ответы на сервер незачем, мы их не храним и не считаем.

export const revalidate = 3600;

type Params = { lang: string; slug: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { lang, slug } = await params;
  if (!isReadyLanguage(lang)) return {};
  const test = quizTest(lang, slug);
  if (!test) return {};
  const dict = await getContent(lang);
  return { title: `${test.title} — ${dict.quizPage.title}` };
}

export default async function QuizTestPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { lang, slug } = await params;
  if (!isReadyLanguage(lang)) notFound();

  const test = quizTest(lang, slug);
  if (!test) notFound();

  const dict = await getContent(lang);
  const words = dict.quizPage;

  const all = quizTests(lang);
  const index = all.findIndex((item) => item.slug === slug);
  const next = all[index + 1] ?? null;

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6 lg:px-10">
      <Link
        href={`/${lang}/quiz`}
        className="inline-flex min-h-11 items-center gap-2 py-2 text-sm text-signal hover:underline"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {words.back}
      </Link>

      <div className="mt-6 max-w-3xl">
        <p className="text-sm text-muted">{words.title}</p>
        <h1 className="mt-1 text-3xl sm:text-4xl">{test.title}</h1>
        <p className="mt-4 text-muted">{words.howBody}</p>
        {words.sourceNote ? <p className="mt-3">{words.sourceNote}</p> : null}

        <Quiz
          questions={test.questions}
          words={words}
          nextHref={next ? `/${lang}/quiz/${next.slug}` : null}
          allHref={`/${lang}/quiz`}
        />

        <p className="mt-12 border-t border-line pt-6 text-sm text-muted">{words.disclaimer}</p>
      </div>
    </div>
  );
}
