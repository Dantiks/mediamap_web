import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

import { startSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { ROLE } from "@/lib/enums";
import { langOrDefault } from "@/lib/i18n/languages";
import { fetchProfile, isConfigured, isProviderId } from "@/lib/oauth";

// Возврат от чужого сервиса: сверяем ответ, находим или заводим человека,
// открываем сессию.

const STATE_COOKIE = "mm_oauth_state";
const LANG_COOKIE = "mm_oauth_lang";
const SITE = process.env.SITE_URL ?? "http://localhost:3000";

const back = (path: string) => NextResponse.redirect(new URL(path, SITE));

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params;

  // Язык запомнили при уходе на вход: в адрес возврата сервис его не кладёт.
  const jar = await cookies();
  const lang = langOrDefault(jar.get(LANG_COOKIE)?.value);
  jar.delete(LANG_COOKIE);
  const login = `/${lang}/account/login`;
  const account = `/${lang}/account`;

  if (!isProviderId(provider) || !isConfigured(provider)) {
    return back(`${login}?error=provider`);
  }

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");

  const expected = jar.get(STATE_COOKIE)?.value;
  jar.delete(STATE_COOKIE);

  // Человек мог отказаться на стороне сервиса — это не ошибка.
  if (!code) return back(login);

  // Строка не сошлась — значит возврат пришёл не с нашего перехода.
  if (!state || !expected || state !== expected) {
    return back(`${login}?error=state`);
  }

  let profile;
  try {
    profile = await fetchProfile(provider, code);
  } catch {
    return back(`${login}?error=provider`);
  }

  // Уже входил этим сервисом — просто открываем сессию.
  const linked = await db.account.findUnique({
    where: { provider_externalId: { provider, externalId: profile.externalId } },
  });

  if (linked) {
    await startSession(linked.userId);
    return back(account);
  }

  /*
    Первый вход этим сервисом.

    Если почта совпала с уже заведённой, привязываем сервис к тому же
    человеку, а не плодим второй аккаунт: иначе сообщения разъедутся по
    двум учётным записям. Сервисы отдают только подтверждённую ими почту,
    так что совпадение адреса — достаточное основание.
  */
  const existing = profile.email
    ? await db.user.findUnique({ where: { email: profile.email } })
    : null;

  const user =
    existing ??
    (await db.user.create({
      data: {
        // Почты может не быть: в Facebook её легко не дать. Тогда ставим
        // служебный адрес — он нужен лишь как уникальный ключ строки.
        email: profile.email ?? `${provider}-${profile.externalId}@external.local`,
        name: profile.name,
        role: ROLE.REPORTER,
      },
    }));

  await db.account.create({
    data: { provider, externalId: profile.externalId, userId: user.id },
  });

  await startSession(user.id);
  return back(account);
}
