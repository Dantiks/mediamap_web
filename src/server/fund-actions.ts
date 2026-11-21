"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { requireEditor } from "@/lib/guard";
import {
  FUND_BASE_LANG,
  linksFromText,
  localizedFromForm,
  type Localized,
} from "@/lib/fund-rules";
import {
  deleteMember,
  deleteProject,
  deleteProjectFile,
  moveMember,
  moveProjectFile,
  storeSmallImage,
} from "./fund";
import { remove } from "./storage";

/*
  Управление разделом фонда из панели.

  Права те же, что у роликов и текстов сайта: это редакторская работа.
  Каждое действие проверяет доступ само — до серверного действия можно
  дотянуться по его адресу, минуя страницу.

  Файлы проектов сюда не приходят: они едут кусками через
  src/app/api/admin/fund/upload, см. там почему.
*/

export type FundState = { error?: string; done?: string };

function refresh(projectId?: number) {
  revalidatePath("/[lang]/media-consult", "page");
  revalidatePath("/[lang]/media-consult/[project]", "page");
  revalidatePath("/admin/fund");
  if (projectId) revalidatePath(`/admin/fund/${projectId}`);
}

const json = (value: Localized | unknown[]) => JSON.stringify(value);

/** «2025-03» из поля month → первое число месяца. Пусто или криво — null. */
function monthOf(form: FormData, field: string): Date | null {
  const value = String(form.get(field) ?? "");
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) return null;
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  return new Date(Date.UTC(Number(match[1]), month - 1, 1));
}

// --- проекты ---------------------------------------------------------------

export async function createProject(
  _previous: FundState,
  form: FormData,
): Promise<FundState> {
  await requireEditor();

  const title = String(form.get("title_ru") ?? "").trim();
  if (!title) return { error: "Нужно название проекта на русском" };

  const project = await db.fundProject.create({
    data: { title: json({ [FUND_BASE_LANG]: title.slice(0, 200) }) },
  });
  redirect(`/admin/fund/${project.id}`);
}

export async function saveProject(
  _previous: FundState,
  form: FormData,
): Promise<FundState> {
  await requireEditor();

  const id = Number(form.get("id"));
  const title = localizedFromForm(form, "title");
  if (!title[FUND_BASE_LANG]) return { error: "Название на русском обязательно" };

  const startDate = monthOf(form, "start");
  const ongoing = form.get("ongoing") === "on";
  const endDate = ongoing ? null : monthOf(form, "end");
  if (startDate && endDate && endDate < startDate) {
    return { error: "Окончание раньше начала — проверьте сроки" };
  }

  const updated = await db.fundProject
    .update({
      where: { id },
      data: {
        title: json(title),
        description: json(localizedFromForm(form, "description")),
        partners: json(localizedFromForm(form, "partners")),
        region: json(localizedFromForm(form, "region")),
        startDate,
        endDate,
        ongoing,
        links: json(linksFromText(String(form.get("links") ?? ""))),
      },
    })
    .catch(() => null);
  if (!updated) return { error: "Проект не найден — возможно, его уже удалили" };

  refresh(id);
  return { done: "Сохранено" };
}

export async function toggleProject(form: FormData): Promise<void> {
  await requireEditor();
  const id = Number(form.get("id"));
  const row = await db.fundProject.findUnique({ where: { id }, select: { published: true } });
  if (!row) return;
  await db.fundProject.update({ where: { id }, data: { published: !row.published } });
  refresh(id);
}

export async function removeProject(form: FormData): Promise<void> {
  await requireEditor();
  await deleteProject(Number(form.get("id")));
  refresh();
  redirect("/admin/fund");
}

// --- файлы проекта ---------------------------------------------------------

export async function removeFile(form: FormData): Promise<void> {
  await requireEditor();
  const projectId = await deleteProjectFile(String(form.get("id") ?? ""));
  refresh(projectId ?? undefined);
}

export async function shiftFile(form: FormData): Promise<void> {
  await requireEditor();
  const projectId = await moveProjectFile(String(form.get("id") ?? ""), form.get("up") !== null);
  refresh(projectId ?? undefined);
}

export async function setCover(form: FormData): Promise<void> {
  await requireEditor();
  const id = String(form.get("id") ?? "");
  const file = await db.fundFile.findUnique({ where: { id }, select: { projectId: true } });
  if (!file) return;
  await db.fundProject.update({ where: { id: file.projectId }, data: { coverId: id } });
  refresh(file.projectId);
}

export async function saveCaption(form: FormData): Promise<void> {
  await requireEditor();
  const id = String(form.get("id") ?? "");
  const file = await db.fundFile
    .update({
      where: { id },
      data: { caption: json(localizedFromForm(form, "caption")) },
      select: { projectId: true },
    })
    .catch(() => null);
  if (file) refresh(file.projectId);
}

// --- «О фонде», контакты, логотип -----------------------------------------

export async function saveProfile(
  _previous: FundState,
  form: FormData,
): Promise<FundState> {
  await requireEditor();

  const email = String(form.get("email") ?? "").trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Почта выглядит неправильно" };
  }

  const data = {
    about: json(localizedFromForm(form, "about")),
    address: json(localizedFromForm(form, "address")),
    email: email || null,
    phone: String(form.get("phone") ?? "").trim().slice(0, 40) || null,
    links: json(linksFromText(String(form.get("links") ?? ""))),
  };

  await db.fundProfile.upsert({ where: { id: 1 }, create: { id: 1, ...data }, update: data });
  refresh();
  return { done: "Сохранено" };
}

export async function saveLogo(
  _previous: FundState,
  form: FormData,
): Promise<FundState> {
  await requireEditor();

  const file = form.get("logo");
  if (!(file instanceof File) || file.size === 0) return { error: "Выберите файл логотипа" };

  const key = await storeSmallImage(file, 800);
  if (typeof key !== "string") return key;

  const old = await db.fundProfile.findUnique({ where: { id: 1 }, select: { logoKey: true } });
  await db.fundProfile.upsert({
    where: { id: 1 },
    create: { id: 1, logoKey: key },
    update: { logoKey: key },
  });
  if (old?.logoKey) await remove(old.logoKey);

  refresh();
  return { done: "Логотип обновлён" };
}

export async function resetLogo(): Promise<void> {
  await requireEditor();
  const old = await db.fundProfile.findUnique({ where: { id: 1 }, select: { logoKey: true } });
  if (!old?.logoKey) return;
  await db.fundProfile.update({ where: { id: 1 }, data: { logoKey: null } });
  await remove(old.logoKey);
  refresh();
}

// --- команда ---------------------------------------------------------------

export async function saveMember(
  _previous: FundState,
  form: FormData,
): Promise<FundState> {
  await requireEditor();

  const id = Number(form.get("id")) || null;
  const name = localizedFromForm(form, "name");
  if (!name[FUND_BASE_LANG]) return { error: "Нужно имя на русском" };

  let photoKey: string | undefined;
  const photo = form.get("photo");
  if (photo instanceof File && photo.size > 0) {
    const key = await storeSmallImage(photo, 600);
    if (typeof key !== "string") return key;
    photoKey = key;
  }

  const data = {
    name: json(name),
    role: json(localizedFromForm(form, "role")),
    ...(photoKey ? { photoKey } : {}),
  };

  if (id) {
    const old = await db.fundMember.findUnique({ where: { id }, select: { photoKey: true } });
    if (!old) return { error: "Человек не найден — возможно, его уже удалили" };
    await db.fundMember.update({ where: { id }, data });
    if (photoKey && old.photoKey) await remove(old.photoKey);
  } else {
    const last = await db.fundMember.aggregate({ _max: { position: true } });
    await db.fundMember.create({ data: { ...data, position: (last._max.position ?? -1) + 1 } });
  }

  refresh();
  return { done: id ? "Сохранено" : "Добавлено" };
}

export async function removeMember(form: FormData): Promise<void> {
  await requireEditor();
  await deleteMember(Number(form.get("id")));
  refresh();
}

export async function shiftMember(form: FormData): Promise<void> {
  await requireEditor();
  await moveMember(Number(form.get("id")), form.get("up") !== null);
  refresh();
}
