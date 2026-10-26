import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";

import type { NewsRow } from "@/server/home-data";
import { formatDate } from "@/lib/format";
import type { Dictionary, Lang } from "@/lib/i18n";

/** Подборка публикаций о медиа и проверке фактов. */
export default function NewsList({
  dict,
  lang,
  news,
}: {
  dict: Dictionary;
  lang: Lang;
  news: NewsRow[];
}) {
  if (news.length === 0) return null;

  return (
    <section className="border-t border-line">
      {/*
        Заголовок слева, список справа. Заголовки новостей короткие, и
        в одну колонку на всю ширину правая половина раздела стояла
        пустой. Пропорция та же, что у «Случаев» выше.
      */}
      <div className="mx-auto grid max-w-[1400px] gap-8 px-4 py-14 sm:px-6 sm:py-16 lg:grid-cols-[1fr_1.5fr] lg:gap-14 lg:px-10 lg:py-24">
        <div>
          <h2 className="text-2xl lg:text-3xl">{dict.home.newsTitle}</h2>
          <p className="mt-2 max-w-sm text-muted">{dict.home.newsLead}</p>
          <Link
            href={`/${lang}/news`}
            className="mt-4 inline-flex min-h-11 items-center gap-1.5 py-2 text-sm text-signal hover:underline"
          >
            {dict.home.newsAll}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        {/* Без линеек: три списка подряд с ними превращали страницу
            в одну длинную таблицу. */}
        <ul className="space-y-5 lg:pt-2">
          {news.map((item) => (
            <li key={item.id}>
              <a
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="group block"
              >
                <span className="text-base group-hover:text-signal">
                  {item.title}
                  {/* Уводит на чужой сайт — предупреждаем стрелкой. */}
                  <ArrowUpRight
                    className="ml-1 inline h-3.5 w-3.5 align-baseline text-muted"
                    aria-hidden="true"
                  />
                  <span className="sr-only">{dict.a11y.externalLink}</span>
                </span>
                <span className="mt-1 block text-sm text-muted">
                  {item.source} · {formatDate(item.publishedAt, lang)}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
