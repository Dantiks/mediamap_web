import { describe, expect, it } from "vitest";

import { parseRange } from "@/lib/http-range";
import {
  FUND_KIND,
  fundRuleFor,
  linksFromText,
  localizedFromForm,
  paragraphs,
  parseLinks,
  parseLocalized,
  pick,
  projectIdFrom,
  projectSlug,
} from "@/lib/fund-rules";

describe("файлы фонда", () => {
  it("принимает документы, фото и видео по расширению", () => {
    expect(fundRuleFor("Отчёт.PDF")?.kind).toBe(FUND_KIND.DOCUMENT);
    expect(fundRuleFor("смета.xlsx")?.kind).toBe(FUND_KIND.DOCUMENT);
    expect(fundRuleFor("IMG_0001.HEIC")?.kind).toBe(FUND_KIND.IMAGE);
    expect(fundRuleFor("тренинг.mov")?.mime).toBe("video/quicktime");
    expect(fundRuleFor("архив.7z")?.ext).toBe("7z");
  });

  it("не принимает программы, страницы и svg", () => {
    for (const name of ["setup.exe", "run.sh", "page.html", "logo.svg", "app.apk", "без-расширения"]) {
      expect(fundRuleFor(name)).toBeNull();
    }
  });
});

describe("тексты на нескольких языках", () => {
  it("свой язык, потом русский, потом любой", () => {
    expect(pick({ ru: "Привет", ky: "Салам" }, "ky")).toEqual({ text: "Салам", lang: "ky" });
    expect(pick({ ru: "Привет" }, "en")).toEqual({ text: "Привет", lang: "ru" });
    expect(pick({ ky: "Салам" }, "en")).toEqual({ text: "Салам", lang: "ky" });
    expect(pick({}, "ru")).toBeNull();
  });

  it("битая строка из базы не роняет страницу", () => {
    expect(parseLocalized("{не json")).toEqual({});
    expect(parseLocalized('["ru"]')).toEqual({});
    expect(parseLocalized('{"ru":"  текст  ","ky":"","en":5}')).toEqual({ ru: "текст" });
  });

  it("собирает поля формы, пустые пропускает", () => {
    const form = new FormData();
    form.set("title_ru", " Тренинг ");
    form.set("title_ky", "");
    form.set("title_en", "Training");
    expect(localizedFromForm(form, "title")).toEqual({ ru: "Тренинг", en: "Training" });
  });

  it("абзацы по пустой строке", () => {
    expect(paragraphs("Первый\nвсё ещё первый\n\n\nВторой")).toEqual(["Первый\nвсё ещё первый", "Второй"]);
  });
});

describe("ссылки", () => {
  it("адрес и подпись через пробел, только http(s)", () => {
    expect(
      linksFromText("https://youtu.be/x Видео с тренинга\njavascript:alert(1) плохо\nftp://a.b\nhttps://kaktus.media/1"),
    ).toEqual([
      { url: "https://youtu.be/x", label: "Видео с тренинга" },
      { url: "https://kaktus.media/1", label: "" },
    ]);
  });

  it("из базы берёт только годные", () => {
    expect(parseLinks('[{"url":"https://a.kg","label":"A"},{"url":"javascript:x","label":"B"}]')).toEqual([
      { url: "https://a.kg", label: "A" },
    ]);
    expect(parseLinks("мусор")).toEqual([]);
  });
});

describe("адрес проекта", () => {
  it("номер и хвост из названия", () => {
    expect(projectSlug(12, "Тренинг для журналистов Оша!")).toBe("12-trening-dlya-zhurnalistov-osha");
    expect(projectSlug(7, "Өнүгүү жана үйрөнүү")).toBe("7-onuguu-zhana-uyronuu");
    expect(projectSlug(3, "«»")).toBe("3");
  });

  it("номер из адреса", () => {
    expect(projectIdFrom("12-trening")).toBe(12);
    expect(projectIdFrom("12")).toBe(12);
    expect(projectIdFrom("trening-12")).toBeNull();
    expect(projectIdFrom("12abc")).toBeNull();
  });
});

describe("Range", () => {
  it("кусок, хвост и кривые заголовки", () => {
    expect(parseRange("bytes=0-99", 1000)).toEqual({ start: 0, end: 99 });
    expect(parseRange("bytes=900-", 1000)).toEqual({ start: 900, end: 999 });
    expect(parseRange("bytes=-100", 1000)).toEqual({ start: 900, end: 999 });
    expect(parseRange("bytes=-", 1000)).toBeNull();
    expect(parseRange("bytes=2000-", 1000)).toBeNull();
    expect(parseRange(null, 1000)).toBeNull();
  });
});
