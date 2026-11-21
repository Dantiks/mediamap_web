import Link from "next/link";

import NewProjectForm from "@/components/admin/fund/NewProjectForm";
import { db } from "@/lib/db";
import { parseLocalized, pick } from "@/lib/fund-rules";
import { requireEditor } from "@/lib/guard";
import { toggleProject } from "@/server/fund-actions";

export const metadata = { title: "Медиа Консалт" };
export const dynamic = "force-dynamic";

/*
  Проекты фонда «Медиа Консалт».

  Новый проект заводится черновиком: сначала пишут текст и грузят файлы,
  смотрят, как это выглядит, и только потом публикуют.
*/

const месяц = new Intl.DateTimeFormat("ru", { month: "short", year: "numeric", timeZone: "UTC" });

function сроки(p: { startDate: Date | null; endDate: Date | null; ongoing: boolean }) {
  const from = p.startDate ? месяц.format(p.startDate) : "";
  const to = p.ongoing ? "идёт" : p.endDate ? месяц.format(p.endDate) : "";
  return [from, to].filter(Boolean).join(" — ") || "—";
}

export default async function AdminFundPage() {
  await requireEditor();

  const projects = await db.fundProject.findMany({
    orderBy: [{ ongoing: "desc" }, { startDate: "desc" }, { createdAt: "desc" }],
    include: { _count: { select: { files: true } } },
  });

  return (
    <>
      <h1>Медиа Консалт</h1>
      <p className="note">
        Страница фонда на сайте:{" "}
        <a href="/ru/media-consult" target="_blank" rel="noreferrer">
          /media-consult
        </a>
        . Здесь проекты с текстом, фото и файлами. Логотип, «О фонде», контакты
        и команда —{" "}
        <Link href="/admin/fund/about">на отдельной странице</Link>.
      </p>

      <section>
        <h2>Новый проект</h2>
        <NewProjectForm />
      </section>

      <section>
        <h2>Проекты ({projects.length})</h2>
        {projects.length === 0 ? (
          <p className="note">Проектов пока нет.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Название</th>
                <th>Сроки</th>
                <th className="num">Файлов</th>
                <th>На сайте</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr key={project.id}>
                  <td>
                    <Link href={`/admin/fund/${project.id}`}>
                      {pick(parseLocalized(project.title), "ru")?.text ?? `Проект ${project.id}`}
                    </Link>
                  </td>
                  <td>{сроки(project)}</td>
                  <td className="num">{project._count.files}</td>
                  <td>
                    <form action={toggleProject}>
                      <input type="hidden" name="id" value={project.id} />
                      {project.published ? "Опубликован " : "Черновик "}
                      <button type="submit">{project.published ? "Снять" : "Опубликовать"}</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
