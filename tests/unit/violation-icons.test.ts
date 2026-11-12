import { describe, expect, it } from "vitest";

import { faceMarkup, typeFace } from "@/lib/violation-icons";

describe("typeFace", () => {
  it("у каждого вида своё лицо, неизвестный получает спокойное", () => {
    const faces = ["hate-speech", "disinformation", "digital-fraud"].map((slug) => JSON.stringify(typeFace(slug)));
    expect(new Set(faces).size).toBe(3);
    expect(typeFace("nope")).toEqual(typeFace("other"));
    expect(faces).not.toContain(JSON.stringify(typeFace("nope")));
  });

  it("разметка для метки красит черты в два цвета", () => {
    const markup = faceMarkup("disinformation", "A", "B");
    expect(markup).toContain('stroke="A"');
    expect(markup).toContain('fill="B"');
  });
});
