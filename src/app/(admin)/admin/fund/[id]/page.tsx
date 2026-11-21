import Link from "next/link";
import { notFound } from "next/navigation";

import FundUploader from "@/components/admin/fund/FundUploader";
import LangFields from "@/components/admin/fund/LangFields";
import ProjectForm from "@/components/admin/fund/ProjectForm";
import { db } from "@/lib/db";
import {
  FUND_KIND,
  humanSize,
  linksToText,
  parseLinks,
  parseLocalized,
  pick,
  projectSlug,
} from "@/lib/fund-rules";
import { requireEditor } from "@/lib/guard";
import {
  removeFile,
  removeProject,
  saveCaption,
  setCover,
  shiftFile,
  toggleProject,
} from "@/server/fund-actions";
import { fileUrl } from "@/server/fund";

export const metadata = { title: "Проект фонда" };
export const dynamic = "force-dynamic";

/** «2025-03» для поля month. */
const month = (date: Date | null) =>
  date ? `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}` : "";

const KIND_LABEL: Record<string, string> = {
  [FUND_KIND.IMAGE]: "фото",
  [FUND_KIND.VIDEO]: "видео",
  [FUND_KIND.DOCUMENT]: "документ",
};

type Params = { params: Promise<{ id: string }> };

export default async function AdminFundProjectPage({ params }: Params) {
  await requireEditor();
  const { id } = await params;

  const project = await db.fundProject.findUnique({
    where: { id: Number.parseInt(id, 10) || 0 },
    include: { files: { orderBy: [{ position: "asc" }, { createdAt: "asc" }] } },
  });
  if (!project) notFound();

  const title = parseLocalized(project.title);
  const slug = projectSlug(project.id, title.ru ?? "");
  const firstPhoto = project.files.find((file) => file.kind === FUND_KIND.IMAGE && file.thumbKey);
  const coverId = project.coverId ?? firstPhoto?.id ?? null;

  return (
    <>
      <p className="note">
        <Link href="/admin/fund">← Все проекты</Link>
      </p>
      <h1>{pick(title, "ru")?.text ?? `Проект ${project.id}`}</h1>

      <div className="actions">
        <form action={toggleProject}>
          <input type="hidden" name="id" value={project.id} />
          <b>{project.published ? "Опубликован" : "Черновик — на сайте его нет"}</b>{" "}
          <button type="submit" className="primary">
            {project.published ? "Снять с сайта" : "Опубликовать"}
          </button>
        </form>
        {/* Черновик редактор видит на сайте тоже: страница пускает его по
            сессии, посетителю она отвечает «не найдено». */}
        <a href={`/ru/media-consult/${slug}`} target="_blank" rel="noreferrer">
          Посмотреть на сайте
        </a>
      </div>

      <section>
        <h2>Текст и сроки</h2>
        <ProjectForm
          id={project.id}
          title={title}
          description={parseLocalized(project.description)}
          partners={parseLocalized(project.partners)}
          region={parseLocalized(project.region)}
          start={month(project.startDate)}
          end={month(project.endDate)}
          ongoing={project.ongoing}
          links={linksToText(parseLinks(project.links))}
        />
      </section>

      <section>
        <h2>Фото, видео и файлы ({project.files.length})</h2>
        <FundUploader projectId={project.id} />

        {project.files.length ? (
          <ol className="fund-files">
            {project.files.map((file, index) => (
              <li key={file.id}>
                <div className="thumb">
                  {file.thumbKey || file.previewKey ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={fileUrl(file.id, file.thumbKey ? "thumb" : "preview")} alt="" />
                  ) : (
                    <span>{file.name.split(".").pop()?.toUpperCase()}</span>
                  )}
                </div>

                <div className="body">
                  <a className="url" href={fileUrl(file.id)} target="_blank" rel="noreferrer">
                    {file.name}
                  </a>
                  <br />
                  <span className="note">
                    {KIND_LABEL[file.kind] ?? file.kind} · {humanSize(file.size, "ru")}
                    {file.kind === FUND_KIND.IMAGE && !file.previewKey
                      ? " · не вышло сделать копию для галереи — на сайте будет скачиваться файлом"
                      : ""}
                    {file.id === coverId ? " · обложка проекта" : ""}
                  </span>

                  <details>
                    <summary>
                      Подпись
                      {pick(parseLocalized(file.caption), "ru")
                        ? `: ${pick(parseLocalized(file.caption), "ru")!.text}`
                        : " (нет — покажем имя файла)"}
                    </summary>
                    <form action={saveCaption}>
                      <input type="hidden" name="id" value={file.id} />
                      <LangFields
                        name="caption"
                        label="Подпись"
                        value={parseLocalized(file.caption)}
                        maxLength={200}
                        placeholder="Тренинг в Оше, март 2025"
                      />
                      <button type="submit">Сохранить подпись</button>
                    </form>
                  </details>

                  <div className="actions">
                    <form action={shiftFile}>
                      <input type="hidden" name="id" value={file.id} />
                      <input type="hidden" name="up" value="1" />
                      <button type="submit" disabled={index === 0} aria-label="Выше">↑</button>
                    </form>
                    <form action={shiftFile}>
                      <input type="hidden" name="id" value={file.id} />
                      <button type="submit" disabled={index === project.files.length - 1} aria-label="Ниже">↓</button>
                    </form>
                    {file.kind === FUND_KIND.IMAGE && file.thumbKey && file.id !== coverId ? (
                      <form action={setCover}>
                        <input type="hidden" name="id" value={file.id} />
                        <button type="submit">Сделать обложкой</button>
                      </form>
                    ) : null}
                    <form action={removeFile}>
                      <input type="hidden" name="id" value={file.id} />
                      <button type="submit" className="danger">Удалить файл</button>
                    </form>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        ) : null}
      </section>

      <section className="undo">
        <h2>Удалить проект</h2>
        <p className="note">
          Проект удалится вместе со всеми файлами, вернуть его будет нельзя.
          Чтобы просто убрать его с сайта, нажмите «Снять с сайта» наверху.
        </p>
        <form action={removeProject}>
          <input type="hidden" name="id" value={project.id} />
          {/* Галочка вместо окна «вы уверены?»: удаление необратимо, а
              кнопка стоит в конце длинной страницы, куда легко промахнуться. */}
          <label>
            <input type="checkbox" required /> Да, удалить проект и все его файлы
          </label>
          <button type="submit" className="danger">Удалить проект насовсем</button>
        </form>
      </section>
    </>
  );
}
