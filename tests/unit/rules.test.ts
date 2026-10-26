import { describe, expect, it } from "vitest";

import { ACCEPT, LIMITS, maxBytesFor, megabytes, ruleFor } from "@/lib/attachment-rules";
import { ATTACHMENT_KIND, canEditContent, isStaff } from "@/lib/enums";
import { FORMS } from "@/lib/i18n";
import { plural, withCount } from "@/lib/plural";
import { assess, assessByRules } from "@/server/ai-review";
import { parseChecks } from "@/server/case-data";

describe("plural", () => {
  const cases = FORMS.ru.cases;

  it("русские формы: 1 случай, 2 случая, 5 случаев", () => {
    expect(withCount(1, cases, "ru")).toBe("1 случай");
    expect(withCount(3, cases, "ru")).toBe("3 случая");
    expect(withCount(5, cases, "ru")).toBe("5 случаев");
    expect(withCount(0, cases, "ru")).toBe("0 случаев");
  });

  it("11–14 — исключение: 11 случаев, а 21 случай", () => {
    expect(withCount(11, cases, "ru")).toBe("11 случаев");
    expect(withCount(14, cases, "ru")).toBe("14 случаев");
    expect(withCount(112, cases, "ru")).toBe("112 случаев");
    expect(withCount(21, cases, "ru")).toBe("21 случай");
    expect(withCount(23, cases, "ru")).toBe("23 случая");
  });

  it("на кыргызском слово после числа не меняется", () => {
    expect(withCount(5, FORMS.ky.cases, "ky")).toBe("5 учур");
  });

  it("на английском: 1 case, 2 cases", () => {
    expect(plural(1, FORMS.en.cases, "en")).toBe("case");
    expect(plural(2, FORMS.en.cases, "en")).toBe("cases");
  });
});

describe("правила вложений", () => {
  it("принимает только белый список типов", () => {
    expect(ruleFor("image/png")).toEqual({ kind: ATTACHMENT_KIND.IMAGE, ext: "png" });
    expect(ruleFor("video/quicktime")?.ext).toBe("mov");
    expect(ruleFor("application/x-msdownload")).toBeNull();
    expect(ruleFor("image/svg+xml")).toBeNull();
    expect(ACCEPT.split(",")).toHaveLength(7);
  });

  it("у видео потолок больше, чем у картинки", () => {
    expect(maxBytesFor(ATTACHMENT_KIND.VIDEO)).toBe(LIMITS.VIDEO_BYTES);
    expect(maxBytesFor(ATTACHMENT_KIND.IMAGE)).toBe(LIMITS.IMAGE_BYTES);
    expect(megabytes(LIMITS.IMAGE_BYTES)).toBe(8);
  });
});

describe("роли", () => {
  it("заявитель не сотрудник, модератор — сотрудник, но не редактор", () => {
    expect(isStaff("REPORTER")).toBe(false);
    expect(isStaff("MODERATOR")).toBe(true);
    expect(canEditContent("MODERATOR")).toBe(false);
    expect(canEditContent("ADMIN")).toBe(true);
    expect(isStaff(null)).toBe(false);
    expect(isStaff("admin")).toBe(false);
  });
});

describe("assessByRules", () => {
  it("без примет — честное «непонятно»", () => {
    const result = assessByRules({
      story: "Сегодня в Бишкеке солнечная погода, на улицах спокойно",
      chosenType: "hate-speech",
      hasLink: false,
    });
    expect(result).toMatchObject({ verdict: "unclear", source: "rules", reasons: ["noMarkers"] });
  });

  it("находит мошенничество по приметам и не превышает 0.8", () => {
    const result = assessByRules({
      story:
        "Мошенники присылают смс с кодом, просят данные карты и перевод денег, обещают выигрыш в розыгрыше банка. ".repeat(
          3,
        ),
      chosenType: "digital-fraud",
      hasLink: true,
    });
    expect(result.verdict).toBe("digital-fraud");
    expect(result.reasons).toEqual(
      expect.arrayContaining(["markersFound", "matchesChoice", "hasLink", "detailed"]),
    );
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.confidence).toBeLessThanOrEqual(0.8);
  });

  it("расхождение с выбором человека снижает уверенность", () => {
    const story = "Пишут фейк, ложная информация, поддельный документ";
    const same = assessByRules({ story, chosenType: "disinformation", hasLink: false });
    const other = assessByRules({ story, chosenType: "hate-speech", hasLink: false });
    expect(other.reasons).toContain("differsFromChoice");
    expect(other.confidence).toBeLessThan(same.confidence);
  });

  it("assess без ML-сервиса отвечает разбором по словам", async () => {
    const run = await assess({ story: "фейк", chosenType: "disinformation", hasLink: false });
    expect(run).toMatchObject({ ok: true, basis: "story", error: null });
    expect(run.assessment.source).toBe("rules");
  });
});

describe("parseChecks", () => {
  it("кривой JSON не роняет страницу", () => {
    expect(parseChecks(null)).toEqual({});
    expect(parseChecks("{not json")).toEqual({});
    expect(parseChecks('"строка"')).toEqual({});
    expect(parseChecks('{"hate-speech":{"found":true}}')).toEqual({ "hate-speech": { found: true } });
  });
});
