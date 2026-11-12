import { describe, expect, it } from "vitest";

import { typeGlyph } from "@/lib/violation-icons";

describe("typeGlyph", () => {
  it("у каждого вида свой значок, неизвестный получает флажок", () => {
    const kinds = ["hate-speech", "disinformation", "digital-fraud"].map((slug) => typeGlyph(slug).join());
    expect(new Set(kinds).size).toBe(3);
    expect(typeGlyph("nope")).toEqual(typeGlyph("other"));
    expect(kinds).not.toContain(typeGlyph("nope").join());
  });
});
