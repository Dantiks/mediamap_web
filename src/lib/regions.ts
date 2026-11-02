// Области Кыргызстана: коды, названия и примерная середина каждой.
//
// Середина нужна карте случаев: новые сообщения приходят с областью, но без
// координат, и метка такого случая встаёт в середину области.

export type Region = {
  code: string;
  name: { ru: string; ky: string; en: string };
  /** Широта и долгота. */
  center: [number, number];
};

export const KG_REGIONS: Region[] = [
  { code: "batken", name: { ru: "Баткенская область", ky: "Баткен облусу", en: "Batken Region" }, center: [39.97, 70.8] },
  { code: "chuy", name: { ru: "Чуйская область", ky: "Чүй облусу", en: "Chuy Region" }, center: [42.75, 74.6] },
  { code: "issyk-kul", name: { ru: "Иссык-Кульская область", ky: "Ысык-Көл облусу", en: "Issyk-Kul Region" }, center: [42.2, 77.6] },
  { code: "jalal-abad", name: { ru: "Джалал-Абадская область", ky: "Жалал-Абад облусу", en: "Jalal-Abad Region" }, center: [41.3, 72.5] },
  { code: "naryn", name: { ru: "Нарынская область", ky: "Нарын облусу", en: "Naryn Region" }, center: [41.4, 75.5] },
  { code: "osh", name: { ru: "Ошская область", ky: "Ош облусу", en: "Osh Region" }, center: [40.1, 73.0] },
  { code: "talas", name: { ru: "Таласская область", ky: "Талас облусу", en: "Talas Region" }, center: [42.4, 72.2] },
];

/** Середина области по коду. Неизвестный код — null. */
export const regionCenter = (code: string | null): [number, number] | null =>
  KG_REGIONS.find((region) => region.code === code)?.center ?? null;
