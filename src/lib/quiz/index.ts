import type { Lang } from "@/lib/i18n";
import en from "./en";
import ru from "./ru";
import type { QuizQuestion, QuizTest } from "./types";

export type { QuizQuestion, QuizTest } from "./types";

/*
  Тесты по языкам.

  Кыргызского перевода пока нет: задания про оттенки смысла, и машинный
  или наспех сделанный перевод исказил бы ровно то, чему они учат. Поэтому
  кыргызская страница показывает русские задания и прямо говорит об этом
  (quizPage.sourceNote), а не делает вид, что перевод есть.
*/
const TESTS: Record<Lang, QuizTest[]> = { ru, ky: ru, en };

/** Есть ли у языка свой перевод заданий. */
export const quizTranslated = (lang: Lang): boolean => lang === "ru" || TESTS[lang] !== ru;

/*
  Варианты перемешаны.

  В документе правильный ответ в 34 заданиях из 42 стоит под буквой B, и
  тот, кто это заметит, набирает почти полный балл, не читая вопросов.
  Перемешиваем детерминированно — от текста вопроса, а не от Math.random:
  сервер и браузер должны получить один и тот же порядок, иначе React
  ругается на расхождение разметки, а человек, вернувшийся к тесту, видит
  варианты на тех же местах.
*/
function seedOf(text: string): number {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function shuffled(question: QuizQuestion): QuizQuestion {
  let seed = seedOf(question.text);
  const order = question.options.map((_, index) => index);
  // Фишер — Йейтс на простом линейном генераторе.
  for (let index = order.length - 1; index > 0; index -= 1) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const other = seed % (index + 1);
    [order[index], order[other]] = [order[other], order[index]];
  }
  return {
    ...question,
    options: order.map((from) => question.options[from]),
    answer: order.indexOf(question.answer),
  };
}

export const quizTests = (lang: Lang): QuizTest[] => TESTS[lang];

/** Тест с перемешанными вариантами — в том виде, в каком его видит человек. */
export function quizTest(lang: Lang, slug: string): QuizTest | null {
  const test = TESTS[lang].find((item) => item.slug === slug);
  if (!test) return null;
  return { ...test, questions: test.questions.map(shuffled) };
}
