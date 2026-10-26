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

  it("неизвестная область — ключ regionUnknown, а не общее «Invalid input»", () => {
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
      Сегодня — по календарю Бишкека, а не по поясу машины. Сервер стоит в
      UTC (тесты тоже, см. vitest.config.ts), и раньше с полуночи до шести
      утра по Бишкеку сегодняшняя дата, подставленная формой, отклонялась
      как «в будущем».
    */
    it("ночью по Бишкеку сегодняшняя дата не считается будущей", () => {
      // 02:00 26 октября по Бишкеку = 20:00 25 октября по UTC.
      vi.useFakeTimers({ now: new Date("2026-10-25T20:00:00Z") });
      expect(today()).toBe("2026-10-26");
      expect(errorFor({ ...valid, happenedAt: "2026-10-26" }, "happenedAt")).toBeUndefined();
      expect(errorFor({ ...valid, happenedAt: "2026-10-27" }, "happenedAt")).toBe(
        ERRORS.dateFuture,
      );
    });

    it("вечером по UTC день меняется ровно в полночь по Бишкеку", () => {
      vi.useFakeTimers({ now: new Date("2026-10-25T17:59:59Z") });
      expect(today()).toBe("2026-10-25");
      vi.setSystemTime(new Date("2026-10-25T18:00:00Z"));
      expect(today()).toBe("2026-10-26");
    });
  });
});
