import { describe, expect, it } from "vitest";

import { CHECK_LIMITS, decide, fresh, SUBMIT_LIMITS, type Record } from "@/server/rate-limit";

const MINUTE = 60_000;

/** Прогоняет серию отправок и возвращает решения и итоговую запись. */
function run(times: number[], start: Record = fresh(), limits = SUBMIT_LIMITS) {
  let record = start;
  const decisions = times.map((now) => {
    const { decision, next } = decide(record, now, limits);
    record = next;
    return decision;
  });
  return { decisions, record };
}

describe("decide", () => {
  it("пять отправок подряд пропускает", () => {
    const { decisions } = run([0, 1000, 2000, 3000, 4000]);
    expect(decisions.every((item) => item.ok)).toBe(true);
  });

  it("шестую подряд останавливает на полминуты", () => {
    const { decisions } = run([0, 1, 2, 3, 4, 5]);
    expect(decisions[5]).toEqual({ ok: false, seconds: 30 });
  });

  it("пока пауза идёт, говорит, сколько осталось", () => {
    const { decisions } = run([0, 1, 2, 3, 4, 5, 10_005]);
    expect(decisions[6]).toEqual({ ok: false, seconds: 20 });
  });

  it("пять сообщений, растянутые на час, — обычная работа", () => {
    const { decisions } = run([0, 12, 24, 36, 48, 60].map((minutes) => minutes * MINUTE));
    expect(decisions.every((item) => item.ok)).toBe(true);
  });

  it("паузы растут: 30 с → 2 мин → 10 мин и дальше не растут", () => {
    let record = fresh();
    const waits: number[] = [];
    let now = 0;
    for (let round = 0; round < 4; round += 1) {
      for (let index = 0; index < 5; index += 1) {
        record = decide(record, now, SUBMIT_LIMITS).next;
        now += 1;
      }
      const { decision, next } = decide(record, now, SUBMIT_LIMITS);
      expect(decision.ok).toBe(false);
      if (!decision.ok) waits.push(decision.seconds);
      record = next;
      now = record.blockedUntil;
    }
    expect(waits).toEqual([30, 120, 600, 600]);
  });

  it("после пятнадцати минут тишины прошлые паузы прощаются", () => {
    const first = run([0, 1, 2, 3, 4, 5]);
    const later = 5 + 16 * MINUTE;
    const second = run([later, later + 1, later + 2, later + 3, later + 4, later + 5], first.record);
    expect(second.decisions[5]).toEqual({ ok: false, seconds: 30 });
  });

  it("у проверки изображений свой, более щедрый порог", () => {
    const times = Array.from({ length: 10 }, (_, index) => index);
    expect(run(times, fresh(), CHECK_LIMITS).decisions.every((item) => item.ok)).toBe(true);
    expect(run([...times, 10], fresh(), CHECK_LIMITS).decisions[10].ok).toBe(false);
  });
});
