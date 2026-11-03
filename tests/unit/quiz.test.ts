import { describe, expect, it } from "vitest";

import { questionParts, quizTest, quizTests, quizTranslated, shuffled } from "@/lib/quiz";
import en from "@/lib/quiz/en";
import ru from "@/lib/quiz/ru";

describe("данные тестов", () => {
  it("шесть тестов по семь заданий, по четыре варианта", () => {
    for (const tests of [ru, en]) {
      expect(tests).toHaveLength(6);
      for (const test of tests) {
        expect(test.questions).toHaveLength(7);
        for (const question of test.questions) {
          expect(question.options).toHaveLength(4);
          expect(question.answer).toBeGreaterThanOrEqual(0);
          expect(question.answer).toBeLessThan(4);
          expect(question.why.length).toBeGreaterThan(10);
        }
      }
    }
  });

  // Ключ из документа: T1Q1–T6Q7, буквы A–D.
  it("правильные ответы совпадают с ключом документа", () => {
    // Документ: T1 — A B C B C A B, T2 — B C B C B B B, T3 — B B B B C B B,
    // T4–T6 — везде B.
    const expected = [
      0, 1, 2, 1, 2, 0, 1,
      1, 2, 1, 2, 1, 1, 1,
      1, 1, 1, 1, 2, 1, 1,
      ...Array(21).fill(1),
    ];
    expect(ru.flatMap((test) => test.questions.map((q) => q.answer))).toEqual(expected);
  });

  it("английская версия совпадает с русской по ответам и адресам", () => {
    expect(en.map((test) => test.slug)).toEqual(ru.map((test) => test.slug));
    expect(en.flatMap((test) => test.questions.map((q) => q.answer))).toEqual(
      ru.flatMap((test) => test.questions.map((q) => q.answer)),
    );
  });

  it("адреса тестов уникальны", () => {
    const slugs = ru.map((test) => test.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});

describe("shuffled", () => {
  const question = ru[0].questions[0];

  it("правильный ответ остаётся правильным после перемешивания", () => {
    for (const test of ru) {
      for (const original of test.questions) {
        const mixed = shuffled(original);
        expect(mixed.options[mixed.answer]).toBe(original.options[original.answer]);
        expect([...mixed.options].sort()).toEqual([...original.options].sort());
      }
    }
  });

  it("порядок один и тот же при каждом вызове — сервер и браузер совпадут", () => {
    expect(shuffled(question)).toEqual(shuffled(question));
  });

  it("правильный ответ больше не стоит почти всегда на одном месте", () => {
    const positions = ru.flatMap((test) => test.questions.map((q) => shuffled(q).answer));
    const counts = [0, 1, 2, 3].map((place) => positions.filter((p) => p === place).length);
    // В документе под B — 34 из 42. После перемешивания ни одно место не
    // должно забирать больше половины.
    expect(Math.max(...counts)).toBeLessThanOrEqual(21);
  });
});

describe("quizTest", () => {
  it("находит тест по адресу и отдаёт перемешанным", () => {
    const test = quizTest("ru", "threats");
    expect(test?.title).toBe("Призывы к насилию и угрозы");
    expect(test?.questions[0]).toEqual(shuffled(ru[2].questions[0]));
  });

  it("неизвестный адрес — null", () => {
    expect(quizTest("ru", "nope")).toBeNull();
  });

  it("кыргызская версия честно показывает русские задания", () => {
    expect(quizTests("ky")).toBe(ru);
    expect(quizTranslated("ky")).toBe(false);
    expect(quizTranslated("ru")).toBe(true);
    expect(quizTranslated("en")).toBe(true);
  });
});

describe("questionParts", () => {
  it("вопрос — последнее предложение, цитата отдельно от подводки", () => {
    const parts = questionParts(
      "В посте утверждается: «Люди этой национальности по природе преступники, им нельзя сдавать жильё». Как точнее классифицировать высказывание?",
    );
    expect(parts.question).toBe("Как точнее классифицировать высказывание?");
    expect(parts.lead).toBe("В посте утверждается:");
    expect(parts.quote).toBe("«Люди этой национальности по природе преступники, им нельзя сдавать жильё»");
  });

  it("ситуация без одной цитаты остаётся текстом", () => {
    const parts = questionParts("Фраза: «Эти чиновники лживы». Не указан защищённый признак. Какой вывод обоснован?");
    expect(parts.quote).toBeNull();
    expect(parts.situation).toBe("Фраза: «Эти чиновники лживы». Не указан защищённый признак.");
  });

  it("у каждого задания на обоих языках есть ситуация и вопрос", () => {
    for (const tests of [ru, en]) {
      for (const question of tests.flatMap((test) => test.questions)) {
        const parts = questionParts(question.text);
        expect(parts.situation.length).toBeGreaterThan(10);
        expect(parts.question.endsWith("?")).toBe(true);
      }
    }
  });
});
