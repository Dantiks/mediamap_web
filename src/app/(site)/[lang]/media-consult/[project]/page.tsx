import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ArrowUpRight, Download, FileText } from "lucide-react";

import FundGallery from "@/components/fund/FundGallery";
import LangTag from "@/components/fund/LangTag";
import { langNote, projectDates } from "@/components/fund/format";
import { currentUser } from "@/lib/auth";
import { canEditContent } from "@/lib/enums";
import { humanSize, projectIdFrom } from "@/lib/fund-rules";
import { isReadyLanguage } from "@/lib/i18n";
import { getContent } from "@/server/content";
import { loadFundProject } from "@/server/fund";

/*
  Страница проекта фонда: что сделали, фотографии, видео, материалы.

  Адрес — номер проекта и хвост из названия. По номеру находим проект,
  а если хвост устарел (проект переименовали), отправляем на новый адрес:
  старые ссылки не ломаются.

  Черновик открывается только редактору — посмотреть перед публикацией.
*/

type Params = { lang: string; project: string };

async function load(params: Promise<Params>) {
  const { lang, project: slug } = await params;
  if (!isReadyLanguage(lang)) return null;
  const id = projectIdFrom(slug);
  if (!id) return null;

  const user = await currentUser();
  const editor = Boolean(user && canEditContent(user.role));
  const project = await loadFundProject(id, lang, { draft: editor });
  return project ? { lang, slug, project } : null;
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const found = await load(params);
  if (!found) return {};
  const { project } = found;
  return {
    title: project.title.text,
    description: project.description[0]?.slice(0, 200),
    openGraph: project.cover ? { images: [project.cover] } : undefined,
  };
}

export default async function FundProjectPage({ params }: { params: Promise<Params> }) {
  const found = await load(params);
  if (!found) notFound();
  const { lang, slug, project } = found;
  if (slug !== project.slug) redirect(`/${lang}/media-consult/${project.slug}`);

  const page = (await getContent(lang)).mediaConsultPage;
  const dates = projectDates(project, lang, page.ongoing);

  const facts = [
    { label: page.dates, value: dates, note: null },
    { label: page.region, value: project.region?.text, note: langNote(project.region, lang, page.shownIn) },
    { label: page.partners, value: project.partners?.text, note: langNote(project.partners, lang, page.shownIn) },
  ].filter((fact) => fact.value);

  return (
    <article>
      {project.published ? null : (
        <p className="bg-fund-ink px-4 py-2 text-center text-sm text-white">{page.draft}</p>
      )}
      <header className="border-t-[6px] border-fund bg-surface">
        <div className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6 lg:px-10">
          <Link
            href={`/${lang}/media-consult`}
            className="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted hover:text-fund"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {page.allProjects}
          </Link>

          {project.ongoing ? (
            <p className="mt-4">
              <span className="rounded-xs bg-fund px-2 py-0.5 text-sm font-medium text-surface">{page.ongoing}</span>
            </p>
          ) : null}

          <h1 className="mt-4 max-w-4xl text-3xl sm:text-5xl">
            {project.title.text}
            <LangTag note={langNote(project.title, lang, page.shownIn)} />
          </h1>

          {facts.length ? (
            <dl className="mt-8 grid max-w-4xl gap-x-10 gap-y-4 border-t border-line pt-6 sm:grid-cols-3">
              {facts.map((fact) => (
                <div key={fact.label}>
                  <dt className="eyebrow">{fact.label}</dt>
                  <dd className="mt-1 whitespace-pre-line">
                    {fact.value}
                    <LangTag note={fact.note} />
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>
      </header>

      <div className="mx-auto max-w-[1400px] space-y-14 px-4 py-12 sm:px-6 lg:px-10">
        {project.description.length ? (
          <section className="max-w-prose space-y-4 text-lg">
            {project.descriptionLang && project.descriptionLang !== lang ? (
              <LangTag note={page.shownIn[project.descriptionLang as keyof typeof page.shownIn] ?? project.descriptionLang} />
            ) : null}
            {project.description.map((text) => (
              <p key={text} className="whitespace-pre-line">{text}</p>
            ))}
          </section>
        ) : null}

        {project.photos.length ? (
          <section>
            <SectionTitle>{page.photosTitle}</SectionTitle>
            <div className="mt-6">
              <FundGallery
                photos={project.photos.map((photo) => ({
                  id: photo.id,
                  thumb: photo.thumb,
                  preview: photo.preview,
                  url: photo.url,
                  caption: photo.caption?.text ?? null,
                  name: photo.name,
                  width: photo.width,
                  height: photo.height,
                }))}
                words={page}
              />
            </div>
          </section>
        ) : null}

        {project.videos.length ? (
          <section>
            <SectionTitle>{page.videosTitle}</SectionTitle>
            <ul className="mt-6 grid gap-6 lg:grid-cols-2">
              {project.videos.map((video) => (
                <li key={video.id}>
                  {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                  <video
                    controls
                    preload="metadata"
                    poster={video.poster ?? undefined}
                    className="aspect-video w-full rounded-xs bg-black"
                  >
                    <source src={video.url} type={video.mime === "video/quicktime" ? "video/mp4" : video.mime} />
                  </video>
                  <p className="mt-2 text-sm text-muted">{video.caption?.text ?? video.name}</p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {project.documents.length ? (
          <section>
            <SectionTitle>{page.filesTitle}</SectionTitle>
            <ul className="mt-6 max-w-3xl divide-y divide-line border-y border-line">
              {project.documents.map((file) => (
                <li key={file.id}>
                  <a
                    href={file.url}
                    className="group flex min-h-16 items-center gap-4 py-3 hover:bg-surface"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xs bg-fund text-surface">
                      <FileText className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium [overflow-wrap:anywhere] group-hover:text-fund">
                        {file.caption?.text ?? file.name}
                      </span>
                      <span className="font-mono text-2xs uppercase text-muted">
                        {file.ext} · {humanSize(file.size, lang)}
                      </span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-sm text-fund">
                      <Download className="h-4 w-4" aria-hidden="true" />
                      <span className="hidden sm:inline">{page.download}</span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {project.links.length ? (
          <section>
            <SectionTitle>{page.linksTitle}</SectionTitle>
            <ul className="mt-6 space-y-1">
              {project.links.map((link) => (
                <li key={link.url}>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-11 items-center gap-1.5 text-lg text-fund underline-offset-4 hover:underline"
                  >
                    {link.text}
                    <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </article>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-3 text-2xl sm:text-3xl">
      <span className="h-6 w-1.5 bg-fund" aria-hidden="true" />
      {children}
    </h2>
  );
}
