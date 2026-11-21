import Link from "next/link";

import type { ProjectCard as Card } from "@/server/fund";
import LangTag from "./LangTag";
import { langNote, projectDates } from "./format";

type Words = { ongoing: string; shownIn: Record<string, string> };

/*
  Карточка проекта в сетке. Вся карточка — одна ссылка: целиться в
  заголовок мелким шрифтом на телефоне неудобно.
*/
export default function ProjectCard({
  project,
  lang,
  words,
}: {
  project: Card;
  lang: string;
  words: Words;
}) {
  const dates = projectDates(project, lang, words.ongoing);

  return (
    <li>
      <Link
        href={`/${lang}/media-consult/${project.slug}`}
        className="group flex h-full flex-col overflow-hidden rounded-xs border border-line bg-surface transition-colors hover:border-fund"
      >
        <div className="relative aspect-[4/3] bg-paper">
          {project.cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={project.cover}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center border-b-4 border-fund bg-fund-ink">
              <span className="font-display text-2xl font-medium text-white/80">
                {project.title.text.slice(0, 1)}
              </span>
            </div>
          )}
          {project.ongoing ? (
            <span className="absolute left-3 top-3 rounded-xs bg-fund px-2 py-0.5 text-sm font-medium text-surface">
              {words.ongoing}
            </span>
          ) : null}
        </div>

        <div className="flex flex-1 flex-col p-5">
          <h3 className="text-lg leading-snug group-hover:text-fund">
            {project.title.text}
            <LangTag note={langNote(project.title, lang, words.shownIn)} />
          </h3>
          <p className="mt-auto pt-3 text-sm text-muted">
            {[dates, project.region?.text].filter(Boolean).join(" · ")}
          </p>
        </div>
      </Link>
    </li>
  );
}
