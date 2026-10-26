// Устройство теста «Проверь себя». Данные — в ru.ts и en.ts.

export type QuizQuestion = {
  /** Ситуация и вопрос к ней. */
  text: string;
  /** Варианты ровно в том порядке, что в документе (A, B, C, D). */
  options: readonly string[];
  /** Индекс правильного варианта, с нуля. */
  answer: number;
  /** Почему верно именно так. Показывается после ответа. */
  why: string;
};

export type QuizTest = {
  /** Часть адреса: /ru/quiz/criticism. Одинаковый во всех языках. */
  slug: string;
  title: string;
  questions: QuizQuestion[];
};
