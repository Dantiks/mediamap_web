import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowUpRight, Mail, MapPin, Phone } from "lucide-react";

import LangTag from "@/components/fund/LangTag";
import ProjectCard from "@/components/fund/ProjectCard";
import { langNote } from "@/components/fund/format";
import { paragraphs } from "@/lib/fund-rules";
import { isReadyLanguage } from "@/lib/i18n";
import { getContent } from "@/server/content";
import { loadFundPage } from "@/server/fund";

/*
  Страница фонда «Медиа Консалт».

  Сверху логотип и «О фонде», ниже проекты карточками, команда и
  контакты. Всё, кроме подписей, фонд заполняет в панели (/admin/fund);
  пустой блок не показывается — лучше без «Команды», чем с пустой рамкой.

  Цвета — фонда, а не MediaMap: тёмно-красный и чёрный с его логотипа.
  Шапка и подвал общие с сайтом.
*/

type Params = { lang: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { lang } = await params;
  if (!isReadyLanguage(lang)) return {};
  const page = (await getContent(lang)).mediaConsultPage;
  return { title: page.title, description: page.lead };
}

export default async function MediaConsultPage({ params }: { params: Promise<Params> }) {
  const { lang } = await params;
  if (!isReadyLanguage(lang)) notFound();

  const [dict, fund] = await Promise.all([getContent(lang), loadFundPage(lang)]);
  const page = dict.mediaConsultPage;
  const contacts = fund.email || fund.phone || fund.address || fund.links.length > 0;

  return (
    <div>
      {/* Первый экран: логотип на белом — он чёрно-красный и на тёмном не
          читается, — и красная полоса фонда сверху. */}
      <section className="border-t-[6px] border-fund bg-surface">
        <div className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6 lg:px-10 lg:py-16">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={fund.logo} alt={page.fundName} className="h-14 w-auto sm:h-16" />
          <h1 className="mt-8 text-3xl sm:text-5xl">{page.title}</h1>
          <p className="mt-3 max-w-3xl text-lg text-muted">{page.fundName}</p>

          {fund.about ? (
            <div className="mt-10 grid gap-8 border-t border-line pt-8 lg:grid-cols-[14rem_1fr]">
              <h2 className="eyebrow !text-fund">
                {page.aboutTitle}
                <LangTag note={langNote(fund.about, lang, page.shownIn)} />
              </h2>
              <div className="max-w-prose space-y-4 text-lg">
                {paragraphs(fund.about.text).map((text) => (
                  <p key={text} className="whitespace-pre-line">{text}</p>
                ))}
              </div>
            </div>
          ) : (
            <p className="mt-6 max-w-prose text-lg">{page.lead}</p>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6 lg:px-10">
        <h2 className="flex items-center gap-3 text-2xl sm:text-3xl">
          <span className="h-6 w-1.5 bg-fund" aria-hidden="true" />
          {page.projectsTitle}
        </h2>
        {fund.projects.length ? (
          <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {fund.projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                lang={lang}
                words={{ ongoing: page.ongoing, shownIn: page.shownIn }}
              />
            ))}
          </ul>
        ) : (
          <p className="mt-6 text-muted">{page.projectsEmpty}</p>
        )}
      </section>

      {fund.members.length ? (
        <section className="mx-auto max-w-[1400px] px-4 pb-12 sm:px-6 lg:px-10">
          <h2 className="flex items-center gap-3 text-2xl sm:text-3xl">
            <span className="h-6 w-1.5 bg-fund" aria-hidden="true" />
            {page.teamTitle}
          </h2>
          <ul className="mt-8 grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
            {fund.members.map((member) => (
              <li key={member.id}>
                {member.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={member.photo}
                    alt=""
                    loading="lazy"
                    className="aspect-square w-full rounded-xs object-cover grayscale-[15%]"
                  />
                ) : (
                  <div className="flex aspect-square w-full items-center justify-center rounded-xs bg-fund-ink font-display text-4xl text-white/70" aria-hidden="true">
                    {member.name.text.slice(0, 1)}
                  </div>
                )}
                <p className="mt-3 font-medium">{member.name.text}</p>
                {member.role ? (
                  <p className="text-sm text-muted">
                    {member.role.text}
                    <LangTag note={langNote(member.role, lang, page.shownIn)} />
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {contacts ? (
        <section className="bg-fund-ink text-white">
          <div className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6 lg:px-10">
            <h2 className="flex items-center gap-3 text-2xl text-white sm:text-3xl">
              <span className="h-6 w-1.5 bg-fund" aria-hidden="true" />
              {page.contactsTitle}
            </h2>
            <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {fund.email ? (
                <li>
                  <p className="flex items-center gap-2 text-sm text-white/70">
                    <Mail className="h-4 w-4" aria-hidden="true" /> {page.email}
                  </p>
                  <a href={`mailto:${fund.email}`} className="mt-1 inline-flex min-h-11 items-center text-lg underline-offset-4 hover:underline">
                    {fund.email}
                  </a>
                </li>
              ) : null}
              {fund.phone ? (
                <li>
                  <p className="flex items-center gap-2 text-sm text-white/70">
                    <Phone className="h-4 w-4" aria-hidden="true" /> {page.phone}
                  </p>
                  <a href={`tel:${fund.phone.replace(/[^\d+]/g, "")}`} className="mt-1 inline-flex min-h-11 items-center text-lg underline-offset-4 hover:underline">
                    {fund.phone}
                  </a>
                </li>
              ) : null}
              {fund.address ? (
                <li>
                  <p className="flex items-center gap-2 text-sm text-white/70">
                    <MapPin className="h-4 w-4" aria-hidden="true" /> {page.address}
                  </p>
                  <p className="mt-1 py-2.5 text-lg">{fund.address.text}</p>
                </li>
              ) : null}
              {fund.links.length ? (
                <li>
                  <ul className="space-y-1">
                    {fund.links.map((link) => (
                      <li key={link.url}>
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex min-h-11 items-center gap-1.5 text-lg underline-offset-4 hover:underline"
                        >
                          {link.text}
                          <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                          <span className="sr-only">{dict.a11y.externalLink}</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </li>
              ) : null}
            </ul>
          </div>
        </section>
      ) : null}
    </div>
  );
}
