import { spawn } from "node:child_process";
import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import sharp from "sharp";

import { db } from "@/lib/db";
import {
  FUND_KIND,
  FUND_MAX_BYTES,
  fundRuleFor,
  linkLabel,
  paragraphs,
  parseLinks,
  parseLocalized,
  pick,
  projectSlug,
  type FundLink,
  type Picked,
} from "@/lib/fund-rules";
import { adopt, filePath, put, remove } from "./storage";

/*
  Раздел фонда «Медиа Консалт»: проекты, их файлы, команда, контакты.

  Всё, что видит посетитель, проходит через функции load* ниже: они
  отдают уже выбранный язык и готовые адреса файлов, сырые колонки JSON
  до страниц не доходят.
*/

// --- адреса файлов ---------------------------------------------------------

export const fileUrl = (id: string, variant?: "preview" | "thumb") =>
  variant ? `/api/fund/files/${id}?v=${variant}` : `/api/fund/files/${id}`;

export const memberPhotoUrl = (id: number) => `/api/fund/members/${id}`;

/** Загруженный логотип, а без него — тот, что лежит в public с самого начала. */
export const logoUrl = (hasLogo: boolean) =>
  hasLogo ? "/api/fund/logo" : "/partners/media-consult.png";

// --- для посетителя --------------------------------------------------------

export type ProjectCard = {
  id: number;
  slug: string;
  title: Picked;
  region: Picked | null;
  startDate: Date | null;
  endDate: Date | null;
  ongoing: boolean;
  cover: string | null;
};

export type FundPageData = {
  about: Picked | null;
  address: Picked | null;
  email: string | null;
  phone: string | null;
  links: (FundLink & { text: string })[];
  logo: string;
  projects: ProjectCard[];
  members: { id: number; name: Picked; role: Picked | null; photo: string | null }[];
};

/*
  Порядок проектов: сначала идущие, потом завершённые, внутри — от новых
  к старым. Проект без дат стоит по дате заведения: это лучше, чем в конце
  списка, куда его никто не долистает.
*/
const projectOrder = (a: ProjectSortable, b: ProjectSortable) =>
  Number(b.ongoing) - Number(a.ongoing) || sortDate(b) - sortDate(a);

type ProjectSortable = {
  ongoing: boolean;
  startDate: Date | null;
  endDate: Date | null;
  createdAt: Date;
};

const sortDate = (p: ProjectSortable) =>
  (p.endDate ?? p.startDate ?? p.createdAt).getTime();

/** Обложка: выбранная редактором фотография, иначе первая по порядку. */
function coverOf(
  coverId: string | null,
  files: { id: string; kind: string; thumbKey: string | null }[],
): string | null {
  const photos = files.filter((file) => file.kind === FUND_KIND.IMAGE && file.thumbKey);
  const chosen = photos.find((file) => file.id === coverId) ?? photos[0];
  return chosen ? fileUrl(chosen.id, "thumb") : null;
}

export async function loadFundPage(lang: string): Promise<FundPageData> {
  const [profile, projects, members] = await Promise.all([
    db.fundProfile.findUnique({ where: { id: 1 } }),
    db.fundProject.findMany({
      where: { published: true },
      include: {
        files: {
          select: { id: true, kind: true, thumbKey: true },
          orderBy: { position: "asc" },
        },
      },
    }),
    db.fundMember.findMany({ orderBy: [{ position: "asc" }, { id: "asc" }] }),
  ]);

  const cards = projects
    .sort(projectOrder)
    .map((project) => toCard(project, lang))
    .filter((card): card is ProjectCard => card !== null);

  return {
    about: pick(parseLocalized(profile?.about), lang),
    address: pick(parseLocalized(profile?.address), lang),
    email: profile?.email ?? null,
    phone: profile?.phone ?? null,
    links: parseLinks(profile?.links).map((link) => ({ ...link, text: linkLabel(link) })),
    logo: logoUrl(Boolean(profile?.logoKey)),
    projects: cards,
    members: members.flatMap((member) => {
      const name = pick(parseLocalized(member.name), lang);
      if (!name) return [];
      return [
        {
          id: member.id,
          name,
          role: pick(parseLocalized(member.role), lang),
          photo: member.photoKey ? memberPhotoUrl(member.id) : null,
        },
      ];
    }),
  };
}

function toCard(
  project: {
    id: number;
    title: string;
    region: string;
    startDate: Date | null;
    endDate: Date | null;
    ongoing: boolean;
    coverId: string | null;
    files: { id: string; kind: string; thumbKey: string | null }[];
  },
  lang: string,
): ProjectCard | null {
  const titles = parseLocalized(project.title);
  const title = pick(titles, lang);
  if (!title) return null;

  return {
    id: project.id,
    // Адрес — по русскому названию: он один на все языки, иначе ссылка,
    // которой поделились с кыргызской версии, не совпала бы с русской.
    slug: projectSlug(project.id, titles.ru ?? title.text),
    title,
    region: pick(parseLocalized(project.region), lang),
    startDate: project.startDate,
    endDate: project.endDate,
    ongoing: project.ongoing,
    cover: coverOf(project.coverId, project.files),
  };
}

export type ProjectFile = {
  id: string;
  name: string;
  size: number;
  caption: Picked | null;
  url: string;
};

export type ProjectDetail = ProjectCard & {
  published: boolean;
  description: string[];
  descriptionLang: string | null;
  partners: Picked | null;
  links: (FundLink & { text: string })[];
  photos: (ProjectFile & { preview: string; thumb: string; width: number | null; height: number | null })[];
  videos: (ProjectFile & { poster: string | null; mime: string })[];
  documents: (ProjectFile & { ext: string })[];
};

/** Проект для страницы. null — нет такого или он не опубликован. */
export async function loadFundProject(
  id: number,
  lang: string,
  { draft = false }: { draft?: boolean } = {},
): Promise<ProjectDetail | null> {
  const project = await db.fundProject.findUnique({
    where: { id },
    include: { files: { orderBy: [{ position: "asc" }, { createdAt: "asc" }] } },
  });
  if (!project || (!project.published && !draft)) return null;

  const card = toCard(project, lang);
  if (!card) return null;

  const description = pick(parseLocalized(project.description), lang);

  const base = (file: (typeof project.files)[number]): ProjectFile => ({
    id: file.id,
    name: file.name,
    size: file.size,
    caption: pick(parseLocalized(file.caption), lang),
    url: fileUrl(file.id),
  });

  const photos: ProjectDetail["photos"] = [];
  const videos: ProjectDetail["videos"] = [];
  const documents: ProjectDetail["documents"] = [];

  for (const file of project.files) {
    if (file.kind === FUND_KIND.IMAGE && file.previewKey && file.thumbKey) {
      photos.push({
        ...base(file),
        preview: fileUrl(file.id, "preview"),
        thumb: fileUrl(file.id, "thumb"),
        width: file.width,
        height: file.height,
      });
    } else if (file.kind === FUND_KIND.VIDEO) {
      videos.push({
        ...base(file),
        poster: file.previewKey ? fileUrl(file.id, "preview") : null,
        mime: file.mime,
      });
    } else {
      // Сюда же фотография, которую не вышло показать (редкий HEIC):
      // пусть хотя бы скачивается.
      documents.push({ ...base(file), ext: fundRuleFor(file.name)?.ext ?? "" });
    }
  }

  return {
    ...card,
    published: project.published,
    description: description ? paragraphs(description.text) : [],
    descriptionLang: description?.lang ?? null,
    partners: pick(parseLocalized(project.partners), lang),
    links: parseLinks(project.links).map((link) => ({ ...link, text: linkLabel(link) })),
    photos,
    videos,
    documents,
  };
}

/** Номера опубликованных проектов — для карты сайта и заготовки страниц. */
export const loadPublishedProjectIds = async (): Promise<number[]> =>
  (await db.fundProject.findMany({ where: { published: true }, select: { id: true } })).map(
    (row) => row.id,
  );

// --- приём файлов ----------------------------------------------------------

export type AddedFile = { id: string } | { error: string };

/**
 * Заводит догруженный файл в проект.
 *
 * Временный файл переезжает в хранилище, для фотографии снимаются копии
 * для галереи, для видео — кадр-обложка. Не вышло снять копию — файл
 * всё равно сохраняется: в худшем случае он будет скачиваться, а не
 * показываться.
 */
export async function addProjectFile(
  projectId: number,
  temp: string,
  name: string,
): Promise<AddedFile> {
  const rule = fundRuleFor(name);
  if (!rule) {
    await rm(temp, { force: true });
    return { error: `Такой тип файла не принимаем: ${name}` };
  }

  const { size } = await stat(temp);
  if (size > FUND_MAX_BYTES) {
    await rm(temp, { force: true });
    return { error: "Файл больше 100 МБ" };
  }

  const project = await db.fundProject.findUnique({ where: { id: projectId }, select: { id: true } });
  if (!project) {
    await rm(temp, { force: true });
    return { error: "Проект не найден — возможно, его уже удалили" };
  }

  const key = await adopt(temp, rule.ext);

  let extra: Awaited<ReturnType<typeof photoCopies>> = null;
  if (rule.kind === FUND_KIND.IMAGE) extra = await photoCopies(filePath(key), rule.ext);
  if (rule.kind === FUND_KIND.VIDEO) extra = await videoPoster(filePath(key));

  const last = await db.fundFile.aggregate({
    where: { projectId },
    _max: { position: true },
  });

  const file = await db.fundFile.create({
    data: {
      projectId,
      kind: rule.kind,
      mime: rule.mime,
      size,
      name: cleanName(name),
      key,
      previewKey: extra?.previewKey ?? null,
      thumbKey: extra?.thumbKey ?? null,
      width: extra?.width ?? null,
      height: extra?.height ?? null,
      position: (last._max.position ?? -1) + 1,
    },
  });

  return { id: file.id };
}

/** Имя для скачивания: без путей и управляющих символов, не длиннее 150. */
const cleanName = (name: string) =>
  name
    .replace(/^.*[\\/]/, "")
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim()
    .slice(-150) || "file";

type Copies = {
  previewKey: string | null;
  thumbKey: string | null;
  width: number | null;
  height: number | null;
} | null;

/*
  Копии фотографии для страницы: до 1600 px для просмотра на весь экран и
  до 640 px для сетки. WebP: вдвое легче JPEG при том же виде, и его
  показывают все живые браузеры.

  rotate() без аргументов поворачивает по EXIF: снимок с телефона иначе
  лёг бы набок.
*/
async function photoCopies(source: string, ext: string): Promise<Copies> {
  let input = source;
  let scratch: string | null = null;

  try {
    // HEIC с айфона sharp из коробки не читает — переводим ffmpeg'ом.
    if (ext === "heic" || ext === "heif") {
      scratch = await mkdtemp(path.join(tmpdir(), "fund-heic-"));
      const jpeg = path.join(scratch, "photo.jpg");
      if (!(await heicToJpeg(source, jpeg))) return null;
      input = jpeg;
    }

    const animated = ext === "gif";
    const preview = await sharp(input, { animated })
      .rotate()
      .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer({ resolveWithObject: true });

    const thumb = await sharp(input)
      .rotate()
      .resize({ width: 640, height: 640, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 78 })
      .toBuffer();

    return {
      previewKey: await put(preview.data, "webp"),
      thumbKey: await put(thumb, "webp"),
      width: preview.info.width,
      height: animated ? (preview.info.pageHeight ?? preview.info.height) : preview.info.height,
    };
  } catch (error) {
    console.error("фонд: не вышло снять копии фотографии:", error);
    return null;
  } finally {
    if (scratch) await rm(scratch, { recursive: true, force: true });
  }
}

/*
  HEIC → JPEG.

  Снимок с айфона лежит в HEIC не одной картинкой, а сеткой фрагментов
  512×512, и ffmpeg сам отдаёт только первый фрагмент. Поэтому раскладку
  читаем ffprobe'ом (группа потоков «Tile Grid»: где стоит каждый
  фрагмент и каков настоящий размер снимка), склеиваем фрагменты xstack и
  обрезаем поля, которыми сетка добита до кратного 512.

  Повёрнутый снимок (портрет с айфона) поворачиваем по матрице поворота
  первого фрагмента. Одиночная картинка без сетки — просто конвертируем.
*/
async function heicToJpeg(source: string, target: string): Promise<boolean> {
  const probe = await run("ffprobe", [
    "-v", "error", "-show_stream_groups", "-show_streams", "-of", "json", source,
  ]);
  if (probe === null) return false;

  type Probe = {
    streams?: { index: number; side_data_list?: { rotation?: number }[] }[];
    stream_groups?: {
      type?: string;
      components?: {
        width?: number;
        height?: number;
        horizontal_offset?: number;
        vertical_offset?: number;
        subcomponents?: { stream_index: number; tile_horizontal_offset: number; tile_vertical_offset: number }[];
      }[];
    }[];
  };

  let info: Probe;
  try {
    info = JSON.parse(probe) as Probe;
  } catch {
    return false;
  }

  const grid = info.stream_groups?.find((group) => group.type === "Tile Grid")?.components?.[0];
  const tiles = grid?.subcomponents ?? [];
  const rotation = info.streams?.[tiles[0]?.stream_index ?? 0]?.side_data_list?.find(
    (side) => typeof side.rotation === "number",
  )?.rotation;
  const turn =
    rotation === 90 || rotation === -270
      ? "transpose=2"
      : rotation === -90 || rotation === 270
        ? "transpose=1"
        : rotation === 180 || rotation === -180
          ? "hflip,vflip"
          : null;

  const output = ["-frames:v", "1", "-q:v", "2", target];

  if (!grid || tiles.length < 2 || !grid.width || !grid.height) {
    const args = ["-y", "-loglevel", "error", "-i", source];
    if (turn) args.push("-vf", turn);
    return (await run("ffmpeg", [...args, ...output])) !== null;
  }

  const inputs = tiles.map((tile) => `[0:${tile.stream_index}]`).join("");
  const layout = tiles.map((tile) => `${tile.tile_horizontal_offset}_${tile.tile_vertical_offset}`).join("|");
  const crop = `crop=${grid.width}:${grid.height}:${grid.horizontal_offset ?? 0}:${grid.vertical_offset ?? 0}`;
  const graph = `${inputs}xstack=inputs=${tiles.length}:layout=${layout},${crop}${turn ? `,${turn}` : ""}[out]`;

  return (
    (await run("ffmpeg", [
      "-y", "-loglevel", "error", "-i", source, "-filter_complex", graph, "-map", "[out]", ...output,
    ])) !== null
  );
}

/** Кадр-обложка видео с первой секунды. Нет ffmpeg — обходимся без неё. */
async function videoPoster(source: string): Promise<Copies> {
  const scratch = await mkdtemp(path.join(tmpdir(), "fund-poster-"));
  try {
    const frame = path.join(scratch, "poster.jpg");
    const ok = await run("ffmpeg", [
      "-y", "-loglevel", "error", "-ss", "1", "-i", source,
      "-frames:v", "1", "-vf", "scale='min(1280,iw)':-2", "-q:v", "3", frame,
    ]);
    if (ok === null) return null;

    const poster = await sharp(frame).webp({ quality: 80 }).toBuffer({ resolveWithObject: true });
    return {
      previewKey: await put(poster.data, "webp"),
      thumbKey: null,
      width: poster.info.width,
      height: poster.info.height,
    };
  } catch (error) {
    console.error("фонд: не вышло снять обложку видео:", error);
    return null;
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
}

/** Запуск внешней программы. null — её нет или она упала. */
function run(command: string, args: string[]): Promise<string | null> {
  return new Promise((done) => {
    let out = "";
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "ignore"] });
    const timer = setTimeout(() => child.kill("SIGKILL"), 60_000);
    child.stdout.on("data", (chunk) => (out += chunk));
    child.on("error", () => {
      clearTimeout(timer);
      done(null);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      done(code === 0 ? out : null);
    });
  });
}

/** Картинка для логотипа или фото в команде: уменьшаем и кладём WebP. */
export async function storeSmallImage(file: File, size: number): Promise<string | { error: string }> {
  const rule = fundRuleFor(file.name);
  if (!rule || rule.kind !== FUND_KIND.IMAGE) return { error: "Нужна картинка: JPG, PNG или WebP" };
  if (file.size > 15 * 1024 * 1024) return { error: "Картинка больше 15 МБ" };

  try {
    const data = await sharp(Buffer.from(await file.arrayBuffer()))
      .rotate()
      .resize({ width: size, height: size, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer();
    return await put(data, "webp");
  } catch {
    return { error: "Не вышло прочитать картинку. Сохраните её как JPG или PNG" };
  }
}

// --- удаление и порядок ----------------------------------------------------

async function dropKeys(keys: (string | null)[]) {
  await Promise.all(keys.filter((key): key is string => !!key).map((key) => remove(key)));
}

export async function deleteProjectFile(id: string): Promise<number | null> {
  const file = await db.fundFile.findUnique({ where: { id } });
  if (!file) return null;

  await db.fundFile.delete({ where: { id } });
  await db.fundProject.updateMany({ where: { coverId: id }, data: { coverId: null } });
  await dropKeys([file.key, file.previewKey, file.thumbKey]);
  return file.projectId;
}

export async function deleteProject(id: number): Promise<void> {
  const files = await db.fundFile.findMany({ where: { projectId: id } });
  await db.fundProject.delete({ where: { id } }).catch(() => {});
  await dropKeys(files.flatMap((file) => [file.key, file.previewKey, file.thumbKey]));
}

/** Сдвигает файл на место выше или ниже среди файлов проекта. */
export async function moveProjectFile(id: string, up: boolean): Promise<number | null> {
  const file = await db.fundFile.findUnique({ where: { id } });
  if (!file) return null;

  const siblings = await db.fundFile.findMany({
    where: { projectId: file.projectId },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    select: { id: true },
  });
  const order = siblings.map((row) => row.id);
  const from = order.indexOf(id);
  const to = up ? from - 1 : from + 1;
  if (to < 0 || to >= order.length) return file.projectId;

  [order[from], order[to]] = [order[to], order[from]];
  await db.$transaction(
    order.map((fileId, position) => db.fundFile.update({ where: { id: fileId }, data: { position } })),
  );
  return file.projectId;
}

export async function moveMember(id: number, up: boolean): Promise<void> {
  const rows = await db.fundMember.findMany({
    orderBy: [{ position: "asc" }, { id: "asc" }],
    select: { id: true },
  });
  const order = rows.map((row) => row.id);
  const from = order.indexOf(id);
  const to = up ? from - 1 : from + 1;
  if (from < 0 || to < 0 || to >= order.length) return;

  [order[from], order[to]] = [order[to], order[from]];
  await db.$transaction(
    order.map((memberId, position) => db.fundMember.update({ where: { id: memberId }, data: { position } })),
  );
}

export async function deleteMember(id: number): Promise<void> {
  const member = await db.fundMember.findUnique({ where: { id } });
  if (!member) return;
  await db.fundMember.delete({ where: { id } });
  await dropKeys([member.photoKey]);
}

