import { describe, expect, it } from "vitest";

import {
  clock,
  decodeEntities,
  formatDate,
  formatMonth,
  hostFromUrl,
  percent,
  shares,
} from "@/lib/format";

describe("formatDate", () => {
  const noon = new Date("2026-10-26T06:00:00Z");

  it("на кыргызском пишет день.месяц.год, а не ICU-шное 2026-26-10", () => {
    expect(formatDate(noon, "ky")).toBe("26.10.2026");
  });

  it("на русском — 26.10.2026", () => {
    expect(formatDate(noon, "ru")).toBe("26.10.2026");
  });

  it("на английском — 26/10/2026 (en-GB)", () => {
    expect(formatDate(noon, "en")).toBe("26/10/2026");
  });

  it("однозначные день и месяц дополняет нулём", () => {
    expect(formatDate(new Date("2026-03-05T06:00:00Z"), "ky")).toBe("05.03.2026");
  });

  /*
    Бишкек — UTC+6. Запись, сделанная в 22:00 по Гринвичу, по Бишкеку уже
    следующего дня; сервер в UTC без явного пояса показал бы вчерашнее число.
  */
  it("считает дату по Бишкеку, а не по поясу сервера", () => {
    const lateUtc = new Date("2026-10-25T20:00:00Z");
    for (const lang of ["ky", "ru"] as const) {
      expect(formatDate(lateUtc, lang)).toBe("26.10.2026");
    }
    expect(formatDate(new Date("2026-10-25T17:59:00Z"), "ky")).toBe("25.10.2026");
  });

  it("переход года тоже по Бишкеку", () => {
    expect(formatDate(new Date("2026-12-31T18:30:00Z"), "ky")).toBe("01.01.2027");
  });
});

describe("formatMonth", () => {
  it("называет месяц словами", () => {
    const date = new Date("2024-11-15T06:00:00Z");
    expect(formatMonth(date, "ru")).toMatch(/ноябр/i);
    expect(formatMonth(date, "ru")).toContain("2024");
    expect(formatMonth(date, "en")).toBe("November 2024");
  });
});

describe("hostFromUrl", () => {
  it("оставляет домен без www", () => {
    expect(hostFromUrl("https://www.facebook.com/some/post?id=1")).toBe("facebook.com");
    expect(hostFromUrl("https://24.kg/obschestvo/123")).toBe("24.kg");
  });

  it("на пустом и кривом адресе отдаёт null", () => {
    expect(hostFromUrl(null)).toBeNull();
    expect(hostFromUrl("")).toBeNull();
    expect(hostFromUrl("facebook.com/post")).toBeNull();
  });
});

describe("percent", () => {
  it("округляет до целого", () => {
    expect(percent(1, 3)).toBe(33);
    expect(percent(2, 3)).toBe(67);
  });

  it("от нуля — ноль, а не NaN", () => {
    expect(percent(0, 0)).toBe(0);
  });
});

describe("shares", () => {
  const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);

  it("три равные доли дают 34+33+33, а не 33+33+33", () => {
    const result = shares([1, 1, 1]);
    expect(sum(result)).toBe(100);
    expect([...result].sort()).toEqual([33, 33, 34]);
  });

  it("случай из комментария: 43+29+29 не превращается в 101", () => {
    // Точно: 42.86 + 28.57 + 28.57. Лишний процент уходит первой доле,
    // у которой остаток больше.
    expect(shares([3, 2, 2])).toEqual([43, 29, 28]);
  });

  it("в сумме всегда ровно 100 — на разных наборах", () => {
    const sets = [
      [1],
      [1, 2],
      [7, 7, 7, 7, 7, 7, 7],
      [65, 30, 5],
      [1, 1000],
      [13, 17, 19, 23, 29, 31],
      [0, 5, 0, 3],
    ];
    for (const parts of sets) {
      const result = shares(parts);
      expect(sum(result), `для ${parts.join(",")}`).toBe(100);
      expect(result.every((value) => Number.isInteger(value) && value >= 0)).toBe(true);
    }
  });

  it("каждая доля отличается от точной меньше чем на единицу", () => {
    const parts = [13, 17, 19, 23, 29, 31];
    const whole = sum(parts);
    shares(parts).forEach((value, index) => {
      expect(Math.abs(value - (parts[index] / whole) * 100)).toBeLessThan(1);
    });
  });

  it("нулевая доля остаётся нулём", () => {
    expect(shares([0, 5, 0, 3])[0]).toBe(0);
    expect(shares([0, 5, 0, 3])[2]).toBe(0);
  });

  it("пустые данные — все нули, без деления на ноль", () => {
    expect(shares([0, 0, 0])).toEqual([0, 0, 0]);
    expect(shares([])).toEqual([]);
  });
});

describe("decodeEntities", () => {
  it("неразрывный пробел превращает в обычный", () => {
    expect(decodeEntities("ЧМ&nbsp;по&nbsp;футболу")).toBe("ЧМ по футболу");
  });

  it("расшифровывает именованные мнемоники", () => {
    expect(decodeEntities("&laquo;Кактус&raquo; &mdash; &amp; &lt;b&gt; &quot;x&quot; &hellip;")).toBe(
      "«Кактус» — & <b> \"x\" …",
    );
  });

  it("регистр имени не важен", () => {
    expect(decodeEntities("A&NBSP;B &Amp;")).toBe("A B &");
  });

  it("расшифровывает числовые: десятичные и шестнадцатеричные", () => {
    expect(decodeEntities("&#171;Да&#187; &#x2014; &#X41;")).toBe("«Да» — A");
  });

  it("незнакомое оставляет как было", () => {
    expect(decodeEntities("&unknown; & текст; AT&T")).toBe("&unknown; & текст; AT&T");
  });

  /*
    Раньше «&#99999999;» ронял String.fromCodePoint с RangeError — и вместе
    с ним разбор всей ленты.
  */
  it("код вне Юникода не роняет разбор, а остаётся как был", () => {
    expect(decodeEntities("a &#99999999; b")).toBe("a &#99999999; b");
    expect(decodeEntities("&#x110000;")).toBe("&#x110000;");
  });

  it("ноль и половинки суррогатных пар тоже остаются как были", () => {
    expect(decodeEntities("&#0; &#xD800; &#57343;")).toBe("&#0; &#xD800; &#57343;");
  });

  it("крайний допустимый код расшифровывается", () => {
    expect(decodeEntities("&#x10FFFF;")).toBe(String.fromCodePoint(0x10ffff));
    expect(decodeEntities("&#128512;")).toBe("😀");
  });

  it("не разбирает дважды: &amp;lt; остаётся &lt;", () => {
    expect(decodeEntities("&amp;lt;script&amp;gt;")).toBe("&lt;script&gt;");
  });
});

describe("clock", () => {
  it("минуты без часов, часы — когда они есть", () => {
    expect(clock(45)).toBe("0:45");
    expect(clock(725)).toBe("12:05");
    expect(clock(3841)).toBe("1:04:01");
  });
});
