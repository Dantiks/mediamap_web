import Link from "next/link";

import LogoForm from "@/components/admin/fund/LogoForm";
import MemberForm from "@/components/admin/fund/MemberForm";
import ProfileForm from "@/components/admin/fund/ProfileForm";
import { db } from "@/lib/db";
import { linksToText, parseLinks, parseLocalized, pick } from "@/lib/fund-rules";
import { requireEditor } from "@/lib/guard";
import { removeMember, resetLogo, shiftMember } from "@/server/fund-actions";
import { logoUrl, memberPhotoUrl } from "@/server/fund";

export const metadata = { title: "О фонде" };
export const dynamic = "force-dynamic";

/** Логотип, «О фонде», контакты и команда фонда «Медиа Консалт». */
export default async function AdminFundAboutPage() {
  await requireEditor();

  const [profile, members] = await Promise.all([
    db.fundProfile.findUnique({ where: { id: 1 } }),
    db.fundMember.findMany({ orderBy: [{ position: "asc" }, { id: "asc" }] }),
  ]);

  return (
    <>
      <p className="note">
        <Link href="/admin/fund">← Проекты фонда</Link>
      </p>
      <h1>О фонде</h1>
      <p className="note">
        Всё, что на странице{" "}
        <a href="/ru/media-consult" target="_blank" rel="noreferrer">
          /media-consult
        </a>{" "}
        кроме проектов. Пустой блок на сайте не показывается.
      </p>

      <section>
        <h2>Логотип</h2>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="fund-logo" src={logoUrl(Boolean(profile?.logoKey))} alt="Логотип фонда" />
        <LogoForm />
        {profile?.logoKey ? (
          <form action={resetLogo}>
            <button type="submit" className="danger">Вернуть прежний логотип</button>
          </form>
        ) : null}
      </section>

      <section>
        <h2>О фонде и контакты</h2>
        <ProfileForm
          about={parseLocalized(profile?.about)}
          address={parseLocalized(profile?.address)}
          email={profile?.email ?? ""}
          phone={profile?.phone ?? ""}
          links={linksToText(parseLinks(profile?.links))}
        />
      </section>

      <section>
        <h2>Команда ({members.length})</h2>
        {members.map((member, index) => {
          const name = parseLocalized(member.name);
          return (
            <article key={member.id}>
              <header className="member">
                {member.photoKey ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={memberPhotoUrl(member.id)} alt="" />
                ) : null}
                <b>{pick(name, "ru")?.text}</b>
                <span className="note">{pick(parseLocalized(member.role), "ru")?.text}</span>
              </header>
              <details>
                <summary>Изменить</summary>
                <MemberForm id={member.id} name={name} role={parseLocalized(member.role)} />
              </details>
              <footer className="actions">
                <form action={shiftMember}>
                  <input type="hidden" name="id" value={member.id} />
                  <input type="hidden" name="up" value="1" />
                  <button type="submit" disabled={index === 0} aria-label="Выше">↑</button>
                </form>
                <form action={shiftMember}>
                  <input type="hidden" name="id" value={member.id} />
                  <button type="submit" disabled={index === members.length - 1} aria-label="Ниже">↓</button>
                </form>
                <form action={removeMember}>
                  <input type="hidden" name="id" value={member.id} />
                  <button type="submit" className="danger">Убрать из команды</button>
                </form>
              </footer>
            </article>
          );
        })}

        <h2>Добавить человека</h2>
        <MemberForm />
      </section>
    </>
  );
}
