import { afterEach, describe, expect, it, vi } from "vitest";

import { ERRORS, LIMITS, reportSchema, today } from "@/lib/report-schema";

// Правильно заполненная форма. Каждый тест портит в ней одно поле.
const valid = {
  typeSlug: "hate-speech",
  link: "https://facebook.com/post/1",
  story: "В комментариях к посту призывают выгнать людей по национальности.",
  city: "Бишкек",
  regionCode: "chuy",
  happenedAt: "2026-10-01",
  consent: "on",
  trap: "",
};

/** Ключ ошибки по полю или undefined, если поле прошло. */
function errorFor(input: Record<string, unknown>, field: string): string | undefined {
  const result = reportSchema.safeParse(input);
  if (result.success) return undefined;
  return result.error.issues.find((issue) => issue.path[0] === field)?.message;
}

afterEach(() => {
  vi.useRealTimers();
});

describe("reportSchema", () => {
  it("принимает правильно заполненную форму", () => {
    vi.useFakeTimers({ now: new Date("2026-10-26T06:00:00Z") });
    expect(reportSchema.safeParse(valid).success).toBe(true);
  });

  it("принимает минимум: вид, рассказ, согласие", () => {
    const result = reportSchema.safeParse({
      typeSlug: "disinformation",
      story: "x".repeat(LIMITS.STORY_MIN),
      consent: "on",
    });
    expect(result.success).toBe(true);
  });

  it("пустые необязательные поля — не ошибка", () => {
    const result = reportSchema.safeParse({
      ...valid,
      link: "",
      city: "",
      regionCode: "",
      happenedAt: "",
    });
    expect(result.success).toBe(true);
  });

  it("без вида — typeRequired", () => {
    expect(errorFor({ ...valid, typeSlug: "" }, "typeSlug")).toBe(ERRORS.typeRequired);
  });

  it("рассказ короче минимума — storyShort, пробелы по краям не считаются", () => {
    expect(errorFor({ ...valid, story: "оскорбили" }, "story")).toBe(ERRORS.storyShort);
    const padded = `   ${"x".repeat(LIMITS.STORY_MIN - 1)}   `;
    expect(errorFor({ ...valid, story: padded }, "story")).toBe(ERRORS.storyShort);
  });

  it("рассказ длиннее максимума — storyLong", () => {
    expect(errorFor({ ...valid, story: "x".repeat(LIMITS.STORY_MAX + 1) }, "story")).toBe(
      ERRORS.storyLong,
    );
    expect(errorFor({ ...valid, story: "x".repeat(LIMITS.STORY_MAX) }, "story")).toBeUndefined();
  });

  it("кривая ссылка — linkInvalid", () => {
    expect(errorFor({ ...valid, link: "не ссылка" }, "link")).toBe(ERRORS.linkInvalid);
  });

  it("слишком длинный город — cityLong", () => {
    expect(errorFor({ ...valid, city: "Б".repeat(LIMITS.CITY_MAX + 1) }, "city")).toBe(
      ERRORS.cityLong,
    );
  });

  it("неизвестная область не проходит", () => {
    expect(errorFor({ ...valid, regionCode: "moscow" }, "regionCode")).toBeDefined();
  });

  /*
    БАГ (мелкий). В zod 4 union из z.literal("") и z.enum отдаёт общее
    «Invalid input», а не ключ regionUnknown: обе ветки падают одинаково, и
    union не выбирает, чью ошибку показать. Ключа «Invalid input» в словаре
    нет. Из настоящей формы до этого не дойти — область выбирают из списка, —
    но объявленный ключ ошибки не срабатывает никогда.
    Когда исправят — заменить it.fails на it.
  */
  it.fails("неизвестная область — ключ regionUnknown", () => {
    expect(errorFor({ ...valid, regionCode: "moscow" }, "regionCode")).toBe(ERRORS.regionUnknown);
  });

  it("без согласия на публикацию — consentRequired", () => {
    expect(errorFor({ ...valid, consent: "" }, "consent")).toBe(ERRORS.consentRequired);
    expect(errorFor({ ...valid, consent: "off" }, "consent")).toBe(ERRORS.consentRequired);
  });

  it("заполненная ловушка для роботов не пропускает форму", () => {
    expect(reportSchema.safeParse({ ...valid, trap: "http://spam" }).success).toBe(false);
  });

  describe("дата", () => {
    it("не в формате ГГГГ-ММ-ДД — dateInvalid", () => {
      expect(errorFor({ ...valid, happenedAt: "01.10.2026" }, "happenedAt")).toBe(
        ERRORS.dateInvalid,
      );
      expect(errorFor({ ...valid, happenedAt: "2026-13-45" }, "happenedAt")).toBe(
        ERRORS.dateInvalid,
      );
    });

    it("в будущем — dateFuture", () => {
      vi.useFakeTimers({ now: new Date("2026-10-26T06:00:00Z") });
      expect(errorFor({ ...valid, happenedAt: "2026-10-27" }, "happenedAt")).toBe(
        ERRORS.dateFuture,
      );
    });

    it("сегодня — можно", () => {
      vi.useFakeTimers({ now: new Date("2026-10-26T06:00:00Z") });
      expect(errorFor({ ...valid, happenedAt: today() }, "happenedAt")).toBeUndefined();
    });

    it("раньше 2000 года — dateAncient", () => {
      expect(errorFor({ ...valid, happenedAt: "1999-12-31" }, "happenedAt")).toBe(
        ERRORS.dateAncient,
      );
      expect(errorFor({ ...valid, happenedAt: LIMITS.EARLIEST }, "happenedAt")).toBeUndefined();
    });

    /*
      БАГ. today() берёт число по часовому поясу машины, а не Бишкека.
      Сервер (deploy/mediamap-web.service) пояс не задаёт, то есть стоит в
      UTC. С полуночи до шести утра по Бишкеку у сервера ещё вчера, и
      сегодняшняя дата — а форма подставляет её сама — отклоняется как
      «в будущем». Человек, который пишет о случае ночью, не может
      отправить форму, не тронув дату.

      Тесты идут с TZ=UTC (vitest.config.ts), как на сервере.
      Помечено it.fails: когда исправят, тест упадёт — заменить на it.
    */
    it.fails("ночью по Бишкеку сегодняшняя дата не считается будущей", () => {
      // 02:00 26 октября по Бишкеку = 20:00 25 октября по UTC.
      vi.useFakeTimers({ now: new Date("2026-10-25T20:00:00Z") });
      expect(errorFor({ ...valid, happenedAt: "2026-10-26" }, "happenedAt")).toBeUndefined();
    });
  });
});
