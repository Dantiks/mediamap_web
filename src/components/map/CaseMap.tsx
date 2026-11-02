"use client";

import "leaflet/dist/leaflet.css";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { LayerGroup, Map as LeafletMap } from "leaflet";

import { formatDate } from "@/lib/format";
import { violationText, type Dictionary, type Lang } from "@/lib/i18n";
import { typeColor } from "@/lib/violation-types";
import type { MapCase } from "@/server/map-data";

/*
  Карта случаев.

  Leaflet трогает window при импорте, поэтому подгружается уже в браузере.
  Текст подписей к меткам собирается через textContent: это слова заявителей,
  и попасть в страницу разметкой они не должны.

  Под картой те же случаи стоят списком: по нему идут с клавиатуры и с
  экранного чтения, и он же показывает, что осталось после фильтра.
*/

const KG_CENTER: [number, number] = [41.3, 74.7];
const KG_ZOOM = 7;

const PIN_COLOR: Record<string, string> = {
  "hate-speech": "var(--color-hate)",
  disinformation: "var(--color-disinfo)",
  "digital-fraud": "var(--color-fraud)",
};

const pinSvg = (color: string) =>
  `<svg viewBox="0 0 28 38" width="28" height="38" aria-hidden="true"><path d="M14 37C10 28 1 22 1 13a13 13 0 0 1 26 0c0 9-9 15-13 24Z" fill="${color}" stroke="#fff" stroke-width="1.5"/><circle cx="14" cy="13" r="5" fill="#fff"/></svg>`;

const element = (tag: string, className: string, text?: string) => {
  const node = document.createElement(tag);
  node.className = className;
  if (text) node.textContent = text;
  return node;
};

type Props = {
  cases: MapCase[];
  types: { slug: string }[];
  dict: Dictionary;
  lang: Lang;
};

export default function CaseMap({ cases, types, dict, lang }: Props) {
  const words = dict.mapPage;
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const layer = useRef<LayerGroup | null>(null);
  const [ready, setReady] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const typeName = (slug: string) => violationText(dict, slug)?.name ?? slug;

  const place = (item: MapCase) =>
    [item.city, item.region].filter(Boolean).join(", ");

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return cases.filter((item) => {
      if (active && item.typeSlug !== active) return false;
      if (!needle) return true;
      return [item.headline, item.text, item.city, item.region, item.publicId]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(needle));
    });
  }, [cases, active, query]);

  // Сама карта создаётся один раз, метки перестраиваются при смене фильтра.
  useEffect(() => {
    let cancelled = false;

    void import("leaflet").then(({ default: L }) => {
      if (cancelled || !box.current || map.current) return;
      const created = L.map(box.current).setView(KG_CENTER, KG_ZOOM);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(created);
      map.current = created;
      layer.current = L.layerGroup().addTo(created);
      setReady(true);
    });

    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
      layer.current = null;
    };
  }, []);

  useEffect(() => {
    if (!ready || !layer.current) return;
    const group = layer.current;

    void import("leaflet").then(({ default: L }) => {
      group.clearLayers();

      for (const item of visible) {
        const icon = L.divIcon({
          className: "",
          html: pinSvg(PIN_COLOR[item.typeSlug] ?? "var(--color-other)"),
          iconSize: [28, 38],
          iconAnchor: [14, 37],
          popupAnchor: [0, -34],
        });

        const popup = element("div", "w-64 space-y-2 text-sm");
        popup.append(
          element("p", "font-semibold", item.headline ?? typeName(item.typeSlug)),
          element(
            "p",
            "text-muted",
            // Без заголовка вид уже стоит первой строкой, повторять его незачем.
            [
              item.headline ? typeName(item.typeSlug) : null,
              formatDate(new Date(item.createdAt), lang),
            ]
              .filter(Boolean)
              .join(" · "),
          ),
        );
        if (place(item)) {
          popup.append(
            element(
              "p",
              "text-muted",
              item.exact ? place(item) : `${place(item)} (${words.approximate})`,
            ),
          );
        }
        if (item.imageId) {
          const image = document.createElement("img");
          image.src = `/api/attachments/${item.imageId}`;
          image.alt = "";
          image.loading = "lazy";
          image.className = "max-h-40 w-full rounded-xs object-cover";
          popup.append(image);
        }
        if (item.text) popup.append(element("p", "", item.text));
        const link = element("a", "font-semibold underline", words.open);
        (link as HTMLAnchorElement).href = `/${lang}/cases/${item.publicId}`;
        popup.append(link);

        L.marker([item.lat, item.lng], {
          icon,
          title: item.headline ?? typeName(item.typeSlug),
          alt: `${typeName(item.typeSlug)}: ${place(item)}`,
        })
          .bindPopup(popup, { maxWidth: 280 })
          .addTo(group);
      }
    });
    // Подписи зависят только от данных и языка, а они меняются вместе с visible.
  }, [ready, visible]);

  const chip = (isActive: boolean) =>
    `inline-flex h-11 items-center gap-2 rounded-xs border px-4 text-base transition-colors ${
      isActive ? "border-ink bg-ink text-surface" : "border-border hover:bg-surface"
    }`;

  return (
    <>
      <div className="mt-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <ul className="flex flex-wrap gap-2" aria-label={words.filterLabel}>
          <li>
            <button
              type="button"
              aria-pressed={active === null}
              onClick={() => setActive(null)}
              className={chip(active === null)}
            >
              {words.filterAll}
              <span className="text-xs tabular-nums opacity-70">{cases.length}</span>
            </button>
          </li>
          {types.map((type) => (
            <li key={type.slug}>
              <button
                type="button"
                aria-pressed={active === type.slug}
                onClick={() => setActive(type.slug)}
                className={chip(active === type.slug)}
              >
                <span
                  className={`h-2 w-2 rounded-full ${typeColor(type.slug)}`}
                  aria-hidden="true"
                />
                {typeName(type.slug)}
                <span className="text-xs tabular-nums opacity-70">
                  {cases.filter((item) => item.typeSlug === type.slug).length}
                </span>
              </button>
            </li>
          ))}
        </ul>

        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={words.search}
          aria-label={words.search}
          className="h-11 w-full rounded-xs border border-border bg-surface px-3 text-base lg:w-80"
        />
      </div>

      {/* isolate: панели Leaflet со своими z-index не должны вылезать поверх
          шапки и её выпадающих списков. */}
      <div
        ref={box}
        data-case-map
        role="region"
        aria-label={words.title}
        className="isolate mt-6 h-[60vh] min-h-[420px] w-full rounded-xs border border-line lg:h-[680px]"
      />

      <h2 className="mt-10 text-2xl">{words.listTitle}</h2>
      {visible.length === 0 ? (
        <p className="mt-4 text-muted">{words.empty}</p>
      ) : (
        <ul className="mt-4 border-t border-line">
          {visible.map((item) => (
            <li key={item.publicId} className="border-b border-line">
              <Link
                href={`/${lang}/cases/${item.publicId}`}
                className="block py-4 transition-colors hover:bg-line/40"
              >
                <span className="flex items-baseline gap-2 text-base">
                  <span
                    className={`mt-1.5 h-2 w-2 shrink-0 self-start rounded-full ${typeColor(item.typeSlug)}`}
                    aria-hidden="true"
                  />
                  {item.headline ?? typeName(item.typeSlug)}
                </span>
                <span className="mt-1 block text-sm text-muted">
                  {[place(item), formatDate(new Date(item.createdAt), lang), item.publicId]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
