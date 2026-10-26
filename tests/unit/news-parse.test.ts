import { describe, expect, it } from "vitest";

import { matchKeyword, parseFeed } from "@/server/news-collect";
import { newsKey, splitPublisher } from "@/server/news-data";
import { ATOM, RSS, RSS_SINGLE } from "../fixtures/feeds";

describe("parseFeed: RSS", () => {
  const items = parseFeed(RSS);

  it("берёт заметки со ссылкой и заголовком, остальные пропускает", () => {
    expect(items.map((item) => item.link)).toEqual([
      "https://24.kg/sport/1",
      "https://24.kg/crime/2",
      "https://24.kg/numbers/3",
      "https://24.kg/x/5",
    ]);
  });

  it("расшифровывает мнемоники в заголовке", () => {
    expect(items[0].title).toBe("ЧМ по футболу: язык вражды в комментариях");
  });

  it("снимает HTML и мнемоники с описания", () => {
    expect(items[0].snippet).toBe("Болельщики оскорбляли игроков сборной.");
  });

  it("разбирает CDATA в заголовке", () => {
    expect(items[1].title).toBe("Мошенничество с картами: новая схема");
  });

  it("без guid узнаёт заметку по ссылке", () => {
    expect(items[0].guid).toBe("24kg-1");
    expect(items[1].guid).toBe("https://24.kg/crime/2");
  });

  it("заголовок из одних цифр остаётся строкой", () => {
    expect(items[2].title).toBe("2026");
  });

  it("читает pubDate и dc:date", () => {
    expect(items[0].publishedAt.toISOString()).toBe("2026-10-26T02:00:00.000Z");
    expect(items[2].publishedAt.toISOString()).toBe("2026-10-24T04:00:00.000Z");
  });

  it("непонятную дату заменяет текущим временем, а заметку не теряет", () => {
    const before = Date.now();
    const [item] = parseFeed(RSS).filter((one) => one.link === "https://24.kg/x/5");
    expect(Math.abs(item.publishedAt.getTime() - before)).toBeLessThan(5000);
  });
});

describe("parseFeed: Atom", () => {
  const [entry] = parseFeed(ATOM);

  it("берёт ссылку alternate из атрибута, а не self", () => {
    expect(entry.link).toBe("https://kloop.kg/2026/10/fake-tax");
  });

  it("guid — из id, описание — из summary", () => {
    expect(entry.guid).toBe("tag:kloop.kg,2026:1");
    expect(entry.snippet).toBe("Проверили «документ».");
  });

  it("заголовок с мнемониками", () => {
    expect(entry.title).toBe("Фейк о «новом налоге» разошёлся по соцсетям");
  });
});

describe("parseFeed: крайние случаи", () => {
  it("лента из одной заметки", () => {
    expect(parseFeed(RSS_SINGLE)).toHaveLength(1);
  });

  it("пустая лента и не лента — пустой список", () => {
    expect(parseFeed("<rss><channel><title>x</title></channel></rss>")).toEqual([]);
    expect(parseFeed("<html><body>404</body></html>")).toEqual([]);
  });
});

describe("matchKeyword", () => {
  it("ищет от начала слова, конец любой — ловит падежи", () => {
    expect(matchKeyword("Дело о мошенничестве в Оше", ["мошенничеств"])).toBe("мошенничеств");
  });

  it("не находит слово внутри другого: «сми» в «космической»", () => {
    expect(matchKeyword("Указ о космической академии", ["сми"])).toBeNull();
    expect(matchKeyword("Независимые СМИ Кыргызстана", ["сми"])).toBe("сми");
  });

  it("регистр и ё не важны", () => {
    expect(matchKeyword("ЛЖЁТ В ЭФИРЕ", ["лжет"])).toBe("лжет");
  });

  it("словосочетания", () => {
    expect(matchKeyword("Язык  вражды в сети", ["язык вражды"])).toBeNull();
    expect(matchKeyword("Язык вражды в сети", ["язык вражды"])).toBe("язык вражды");
  });

  it("спецсимволы в слове не ломают выражение", () => {
    expect(matchKeyword("Рост цен (на 20%)", ["(на"])).toBe("(на");
    expect(matchKeyword("24.kg сообщает", ["24.kg"])).toBe("24.kg");
    expect(matchKeyword("244kg", ["24.kg"])).toBeNull();
  });

  it("возвращает первое подошедшее слово, без слов — null", () => {
    expect(matchKeyword("фейк и дипфейк", ["дипфейк", "фейк"])).toBe("дипфейк");
    expect(matchKeyword("что угодно", [])).toBeNull();
  });
});

describe("splitPublisher", () => {
  it("отрезает короткую подпись издания и сводит синонимы", () => {
    expect(splitPublisher("Мошенники атакуют пенсионеров в Бишкеке - Кактус Медиа")).toEqual({
      title: "Мошенники атакуют пенсионеров в Бишкеке",
      publisher: "Kaktus Media",
    });
  });

  it("длинный хвост после тире — часть заголовка", () => {
    const title = "Депутат ответил на критику - это была не моя идея, сказал он журналистам";
    expect(splitPublisher(title)).toEqual({ title, publisher: null });
  });

  it("одна и та же новость с разными подписями даёт один ключ", () => {
    expect(newsKey("Новость про выборы в Бишкеке - Kaktus.media")).toBe(
      newsKey("Новость про выборы в Бишкеке - Кактус Медиа"),
    );
  });
});
