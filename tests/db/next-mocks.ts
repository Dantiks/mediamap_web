import { vi } from "vitest";

/*
  Подмена того, что даёт Next во время запроса: куки, заголовки, переход на
  другую страницу. Серверные действия зовут их напрямую, а вне запроса
  настоящие функции бросают «called outside a request scope».

  Подключается через vi.mock в каждом файле, которому это нужно.
*/

/** Куки «браузера» текущего теста. */
export const jar = new Map<string, string>();

/** Заголовки запроса. Адрес свой у каждого теста — чтобы не упереться в частоту. */
export const requestHeaders = new Headers();

export function resetRequest(): void {
  jar.clear();
  requestHeaders.set("x-forwarded-for", `10.0.0.${Math.floor(Math.random() * 250)}`);
}

export const cookiesMock = async () => ({
  get: (name: string) => (jar.has(name) ? { name, value: jar.get(name)! } : undefined),
  set: (name: string, value: string) => {
    jar.set(name, value);
  },
  delete: (name: string) => {
    jar.delete(name);
  },
});

export const headersMock = async () => requestHeaders;

/** Ошибка, которой «перенаправляет» подменённый redirect. */
export class Redirect extends Error {
  constructor(public url: string) {
    super(`redirect ${url}`);
  }
}

export const redirectMock = (url: string): never => {
  throw new Redirect(url);
};

/** Куда увело действие. Ничего не увело — тест падает. */
export async function redirectOf(action: Promise<unknown>): Promise<string> {
  try {
    await action;
  } catch (error) {
    if (error instanceof Redirect) return error.url;
    throw error;
  }
  throw new Error("действие не перенаправило");
}

export const afterMock = vi.fn();
