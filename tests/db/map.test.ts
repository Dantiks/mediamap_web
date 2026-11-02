import { beforeEach, describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import { loadMapCases } from "@/server/map-data";
import { wipe } from "./db-helpers";

// На карту попадает только подтверждённое и только то, что можно поставить.

let typeId: number;
let number = 0;

const report = (fields: Record<string, unknown>) => {
  number += 1;
  return db.report.create({
    data: {
      publicId: `MM-2026-${String(number).padStart(4, "0")}`,
      status: "APPROVED",
      violationTypeId: typeId,
      ...fields,
    },
  });
};

beforeEach(async () => {
  await wipe();
  const type = await db.violationType.upsert({
    where: { slug: "hate-speech" },
    update: {},
    create: { slug: "hate-speech", sort: 1 },
  });
  typeId = type.id;
});

describe("loadMapCases", () => {
  it("непроверенное на карту не попадает", async () => {
    await report({ lat: 42.8, lng: 74.6, status: "PENDING" });
    const { cases, withoutPlace } = await loadMapCases("ru");
    expect(cases).toEqual([]);
    expect(withoutPlace).toBe(0);
  });

  it("без координат — в середину области, с пометкой", async () => {
    await report({ regionCode: "naryn" });
    const { cases } = await loadMapCases("ru");
    expect(cases[0]).toMatchObject({
      lat: 41.4,
      lng: 75.5,
      exact: false,
      region: "Нарынская область",
    });
  });

  it("без места вообще — считается отдельно", async () => {
    await report({ city: "Бишкек" });
    const { cases, withoutPlace } = await loadMapCases("ru");
    expect(cases).toEqual([]);
    expect(withoutPlace).toBe(1);
  });

  it("скрытый снимок и снимок с QR наружу не отдаются", async () => {
    const row = await report({ lat: 42.8, lng: 74.6 });
    const file = { reportId: row.id, kind: "IMAGE", mime: "image/png", size: 1, name: "a.png" };
    await db.attachment.create({ data: { ...file, key: "a.png" } });
    await db.attachment.create({ data: { ...file, key: "b.png", public: true, qrSummary: "ссылка" } });
    let { cases } = await loadMapCases("ru");
    expect(cases[0].imageId).toBeNull();

    const open = await db.attachment.create({ data: { ...file, key: "c.png", public: true } });
    ({ cases } = await loadMapCases("ru"));
    expect(cases[0].imageId).toBe(open.id);
  });
});
