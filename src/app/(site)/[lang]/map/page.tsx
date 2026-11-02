import type { Metadata } from "next";
import { notFound } from "next/navigation";

import CaseMap from "@/components/map/CaseMap";
import { isReadyLanguage } from "@/lib/i18n";
import { getContent } from "@/server/content";
import { loadMapCases } from "@/server/map-data";
import { loadViolationTypes } from "@/server/violations";

// Карта подтверждённых случаев. Запрос здесь, вся работа с картой — в CaseMap.

export const revalidate = 300;

type Params = { lang: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { lang } = await params;
  if (!isReadyLanguage(lang)) return {};
  const dict = await getContent(lang);
  return { title: dict.mapPage.title, description: dict.mapPage.lead };
}

export default async function MapPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { lang } = await params;
  if (!isReadyLanguage(lang)) notFound();

  const dict = await getContent(lang);
  const [{ cases, withoutPlace }, types] = await Promise.all([
    loadMapCases(lang),
    loadViolationTypes(),
  ]);

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6 lg:px-10">
      <h1 className="text-3xl sm:text-4xl">{dict.mapPage.title}</h1>
      <p className="mt-4 max-w-prose text-lg text-muted">{dict.mapPage.lead}</p>

      <CaseMap cases={cases} types={types} dict={dict} lang={lang} />

      {withoutPlace > 0 ? (
        <p className="mt-6 text-sm text-muted">
          {dict.mapPage.withoutPlace.replace("{n}", String(withoutPlace))}
        </p>
      ) : null}
    </div>
  );
}
