import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", async () => {
  const mocks = await import("./next-mocks");
  return { cookies: mocks.cookiesMock, headers: mocks.headersMock };
});
vi.mock("next/navigation", async () => ({
  redirect: (await import("./next-mocks")).redirectMock,
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { currentUser, hashPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  adoptReports,
  changePassword,
  register,
  signInAccount,
  signOutAccount,
} from "@/server/account-actions";
import { signIn } from "@/server/auth-actions";
import { loadAccountReports, loadMyReports } from "@/server/my-reports-actions";
import { makeReport, seedTypes, wipe } from "./db-helpers";
import { jar, redirectOf, resetRequest } from "./next-mocks";

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
};

beforeEach(async () => {
  await wipe();
  await seedTypes();
  resetRequest();
});

describe("регистрация заявителя", () => {
  it("заводит REPORTER, входит и ведёт в кабинет", async () => {
    const url = await redirectOf(
      register({}, form({ email: "Aigul@Example.kg", password: "надёжный-пароль", lang: "ru" })),
    );
    expect(url).toBe("/ru/account");

    const user = await db.user.findUniqueOrThrow({ where: { email: "aigul@example.kg" } });
    expect(user.role).toBe("REPORTER");
    expect(user.passwordHash).not.toContain("надёжный");

    expect(await currentUser()).toMatchObject({ email: "aigul@example.kg", role: "REPORTER" });
  });

  /*
    Раньше register и signInAccount вели на /ru/account, а signOutAccount —
    на /ru, с какой бы версии сайта ни пришла форма.
  */
  it("с кыргызской страницы ведёт в кабинет на кыргызском", async () => {
    const url = await redirectOf(
      register({}, form({ email: "ky@example.kg", password: "12345678", lang: "ky" })),
    );
    expect(url).toBe("/ky/account");
  });

  it("с английской — на английский", async () => {
    const url = await redirectOf(
      register({}, form({ email: "en@example.kg", password: "12345678", lang: "en" })),
    );
    expect(url).toBe("/en/account");
  });

  it("без языка или с чужим значением — на язык по умолчанию", async () => {
    expect(
      await redirectOf(register({}, form({ email: "x@example.kg", password: "12345678" }))),
    ).toBe("/ky/account");
    jar.clear();
    expect(
      await redirectOf(
        register({}, form({ email: "y@example.kg", password: "12345678", lang: "//evil.example" })),
      ),
    ).toBe("/ky/account");
  });

  it("роль из формы игнорируется", async () => {
    await redirectOf(
      register({}, form({ email: "hacker@example.kg", password: "12345678", role: "ADMIN" })),
    );
    const user = await db.user.findUniqueOrThrow({ where: { email: "hacker@example.kg" } });
    expect(user.role).toBe("REPORTER");
  });

  it("занятая почта — taken, без второй записи", async () => {
    await redirectOf(register({}, form({ email: "a@b.kg", password: "12345678" })));
    jar.clear();
    const state = await register({}, form({ email: "A@B.kg", password: "87654321" }));
    expect(state).toEqual({ error: "taken", email: "a@b.kg" });
    expect(await db.user.count()).toBe(1);
  });

  it("короткий пароль — passwordShort, почта возвращается в форму", async () => {
    const state = await register({}, form({ email: "a@b.kg", password: "123" }));
    expect(state).toEqual({ error: "passwordShort", email: "a@b.kg" });
    expect(await db.user.count()).toBe(0);
  });
});

describe("вход заявителя", () => {
  beforeEach(async () => {
    await db.user.create({
      data: { email: "user@example.kg", passwordHash: await hashPassword("правильный") },
    });
  });

  it("с верным паролем входит", async () => {
    const url = await redirectOf(
      signInAccount({}, form({ email: "USER@example.kg", password: "правильный", lang: "ky" })),
    );
    expect(url).toBe("/ky/account");
    expect((await currentUser())?.email).toBe("user@example.kg");
  });

  it("неверный пароль и чужая почта дают один и тот же ответ", async () => {
    const wrongPassword = await signInAccount({}, form({ email: "user@example.kg", password: "x" }));
    const unknown = await signInAccount({}, form({ email: "nobody@example.kg", password: "x" }));
    expect(wrongPassword.error).toBe("wrong");
    expect(unknown.error).toBe("wrong");
    expect(jar.size).toBe(0);
  });

  it("выход закрывает сессию и в базе", async () => {
    await redirectOf(signInAccount({}, form({ email: "user@example.kg", password: "правильный" })));
    expect(await db.session.count()).toBe(1);
    expect(await redirectOf(signOutAccount(form({ lang: "en" })))).toBe("/en");
    expect(await db.session.count()).toBe(0);
    expect(await currentUser()).toBeNull();
  });

  it("просроченная сессия не пускает и удаляется", async () => {
    const user = await db.user.findUniqueOrThrow({ where: { email: "user@example.kg" } });
    const session = await db.session.create({
      data: { userId: user.id, expiresAt: new Date(Date.now() - 1000) },
    });
    jar.set("mm_session", session.id);
    expect(await currentUser()).toBeNull();
    expect(await db.session.count()).toBe(0);
  });
});

describe("вход в панель", () => {
  it("заявителя в панель не пускает", async () => {
    await db.user.create({
      data: { email: "user@example.kg", passwordHash: await hashPassword("правильный-пароль") },
    });
    const state = await signIn({}, form({ email: "user@example.kg", password: "правильный-пароль" }));
    expect(state).toEqual({ error: "wrong" });
    expect(jar.size).toBe(0);
  });

  it("администратора пускает в /admin", async () => {
    await db.user.create({
      data: {
        email: "admin@example.kg",
        role: "ADMIN",
        passwordHash: await hashPassword("пароль-администратора"),
      },
    });
    const url = await redirectOf(
      signIn({}, form({ email: "admin@example.kg", password: "пароль-администратора" })),
    );
    expect(url).toBe("/admin");
  });
});

describe("смена пароля", () => {
  beforeEach(async () => {
    await redirectOf(register({}, form({ email: "u@example.kg", password: "старый-пароль" })));
  });

  it("требует текущий пароль", async () => {
    const state = await changePassword({}, form({ current: "не тот", password: "новый-пароль" }));
    expect(state).toEqual({ error: "currentWrong" });
  });

  it("не принимает тот же самый пароль", async () => {
    const state = await changePassword(
      {},
      form({ current: "старый-пароль", password: "старый-пароль" }),
    );
    expect(state).toEqual({ error: "samePassword" });
  });

  it("меняет пароль и закрывает остальные сессии, кроме текущей", async () => {
    const user = await db.user.findUniqueOrThrow({ where: { email: "u@example.kg" } });
    await db.session.create({
      data: { userId: user.id, expiresAt: new Date(Date.now() + 86_400_000) },
    });
    expect(await db.session.count()).toBe(2);

    const state = await changePassword(
      {},
      form({ current: "старый-пароль", password: "новый-пароль" }),
    );
    expect(state).toEqual({ done: true });
    expect(await db.session.count()).toBe(1);
    expect(await currentUser()).not.toBeNull();
  });
});

describe("мои сообщения", () => {
  it("по ключам из браузера отдаёт только свои, с обрезанным текстом", async () => {
    const mine = await makeReport({ receiptToken: "mine", authorComment: "А".repeat(300) });
    await makeReport({ receiptToken: "someone-else" });

    const list = await loadMyReports(["mine", "", "unknown"]);
    expect(list).toHaveLength(1);
    expect(list[0].publicId).toBe(mine.publicId);
    expect(list[0].excerpt?.endsWith("…")).toBe(true);
    expect(list[0].excerpt!.length).toBeLessThanOrEqual(141);
  });

  it("после входа присваивает анонимные сообщения, но не чужие", async () => {
    const other = await db.user.create({ data: { email: "other@example.kg" } });
    await makeReport({ receiptToken: "anon" });
    await makeReport({ receiptToken: "taken", authorId: other.id });

    await redirectOf(register({}, form({ email: "me@example.kg", password: "12345678" })));
    expect(await adoptReports(["anon", "taken"])).toBe(1);

    const list = await loadAccountReports();
    expect(list.map((item) => item.token)).toEqual(["anon"]);
  });

  it("не вошедшему — пустой список и ничего не присваивается", async () => {
    await makeReport({ receiptToken: "anon" });
    expect(await adoptReports(["anon"])).toBe(0);
    expect(await loadAccountReports()).toEqual([]);
  });
});
