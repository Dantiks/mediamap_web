"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Eye, Inbox, Menu, Search, UserRound, X } from "lucide-react";

import LanguageSwitcher from "./LanguageSwitcher";
import LowVisionPanel from "./LowVisionPanel";
import type { Dictionary, Lang } from "@/lib/i18n";

// Два правила, оба выстраданы на старом сайте:
// 1. Шапка ниже всего, что перекрывает страницу. Была выше модалок —
//    крестик закрытия физически прятался под ней.
// 2. Ничего не меняет размер от наведения. Кнопка поиска разъезжалась
//    с 40 до 240px и толкала соседей.

type Account = { name: string; staff: boolean } | null;

type Props = { dict: Dictionary; lang: Lang; account: Account };

export default function Header({ dict, lang, account }: Props) {
  // Сотрудника ведём в панель, остальных — в кабинет заявителя: это разные
  // места, и путать их незачем.
  const accountHref = account?.staff ? "/admin" : `/${lang}/account`;
  const accountLabel = account?.staff ? dict.nav.panel : dict.nav.account;
  const [isOpen, setIsOpen] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const [isLowVisionOpen, setIsLowVisionOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();

  // Иначе на телефоне меню висит поверх новой страницы.
  useEffect(() => {
    setIsOpen(false);
    setIsMoreOpen(false);
    setIsLowVisionOpen(false);
  }, [pathname]);

  /*
    Рубрик стало десять. Все в строку не встают даже на широком экране, а
    сжимать их до нечитаемого — хуже, чем спрятать половину: пять частых
    остаются на виду, остальные уходят под «Ещё».

    Список под «Ещё» закрывается по клику мимо и по Esc. Без этого он
    оставался висеть, когда человек передумал, и перекрывал страницу.
  */
  useEffect(() => {
    if (!isMoreOpen) return;

    const outside = (event: MouseEvent) => {
      if (!moreRef.current?.contains(event.target as Node)) setIsMoreOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsMoreOpen(false);
    };

    document.addEventListener("mousedown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [isMoreOpen]);

  const primary = [
    { href: `/${lang}/cases`, label: dict.nav.cases },
    { href: `/${lang}/types`, label: dict.nav.types },
    { href: `/${lang}/analytics`, label: dict.nav.analytics },
    { href: `/${lang}/news`, label: dict.nav.news },
    /*
      «Видео» в строке только с 1440. Ниже на кыргызском шапка и без него
      не вставала в строку: с кнопкой версии для слабовидящих и всегда
      видимой красной кнопкой ей нужно около 1350 px. До 1440 он стоит
      первым под «Ещё».
    */
    { href: `/${lang}/videos`, label: dict.nav.videos, wide: true },
  ];

  const narrowOnly = primary.filter((item) => item.wide);

  const secondary = [
    { href: `/${lang}/check`, label: dict.nav.check },
    { href: `/${lang}/resources`, label: dict.nav.resources },
    { href: `/${lang}/glossary`, label: dict.nav.glossary },
    { href: `/${lang}/quiz`, label: dict.nav.quiz },
    { href: `/${lang}/about`, label: dict.nav.about },
    { href: `/${lang}/contacts`, label: dict.nav.contacts },
  ];

  // В телефонном меню места хватает — там показываем всё подряд.
  const items = [...primary, ...secondary];

  /*
    Раздел активен и на своих вложенных страницах: на странице случая
    меню раньше не подсвечивало ничего, и было непонятно, где ты.
  */
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  /*
    Гостю — «Мои сообщения», а не «Войти». Сайт обещает писать без имени,
    и заметная кнопка входа это обещание размывала. Вход никуда не делся:
    он на странице своих сообщений.
  */
  const personalHref = account ? accountHref : `/${lang}/report/my`;
  const personalLabel = account ? accountLabel : dict.myReports.link;

  return (
    <header className="sticky top-0 z-[100] border-b border-line bg-paper">
      {/* На широком экране промежутки уже, чем на планшете: с кнопкой
          версии для слабовидящих рубрики и кнопки иначе не вставали в
          строку — на 1024 вылезали за край, на 1280 подписи «Мои
          сообщения» и «Сообщить о нарушении» ломались в две строки. */}
      <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-3 px-4 sm:gap-6 sm:px-6 lg:gap-3 lg:px-10 xl:gap-4">
        <Link
          href={`/${lang}`}
          className="flex h-11 items-center gap-2 font-display text-lg font-medium tracking-tight whitespace-nowrap"
        >
          {dict.brand}
          {/* Метка «бета» рядом с названием: сайт показывают вживую, и
              читатель должен понимать, что это ещё не окончательная версия.
              Серая, а не красная: это предупреждение, а не действие. */}
          <span data-header-beta className="rounded-xs border border-line bg-surface px-1.5 py-0.5 font-mono text-2xs font-normal tracking-wide text-muted uppercase">
            {dict.nav.beta}
          </span>
        </Link>

        {/* data-header-* — зацепки для версии для слабовидящих: крупным
            шрифтом рубрики в строку не встают, и шапка уходит в меню
            на любой ширине (globals.css).
            Рубрики в строке — с 1280. Ниже, на 1024–1200, они вместе со
            всегда видимой красной кнопкой не вставали в строку на
            кыргызском и русском, и шапку выносило за край; там меню. */}
        <nav data-header-nav className="hidden flex-1 items-center gap-3 xl:flex">
          {primary.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              // Одного цвета мало: серый и почти чёрный рядом почти не
              // различить. Активный пункт ещё и подчёркнут.
              className={`relative h-11 items-center whitespace-nowrap text-sm transition-colors hover:text-signal ${
                item.wide ? "hidden min-[1440px]:flex" : "flex"
              } ${
                isActive(item.href)
                  ? "font-medium text-ink after:absolute after:inset-x-0 after:bottom-1.5 after:h-0.5 after:bg-signal"
                  : "text-muted"
              }`}
            >
              {item.label}
            </Link>
          ))}

          <div className="relative" ref={moreRef}>
            <button
              type="button"
              onClick={() => setIsMoreOpen((value) => !value)}
              aria-expanded={isMoreOpen}
              className={`relative flex h-11 items-center gap-1 text-sm transition-colors hover:text-signal ${
                secondary.some((item) => isActive(item.href))
                  ? "font-medium text-ink after:absolute after:inset-x-0 after:bottom-1.5 after:h-0.5 after:bg-signal"
                  : "text-muted"
              }`}
            >
              {dict.nav.more}
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
            </button>

            {isMoreOpen ? (
              <ul className="absolute left-0 top-full z-10 min-w-52 border border-line bg-paper py-1 shadow-sm">
                {[...narrowOnly, ...secondary].map((item) => (
                  <li
                    key={item.href}
                    className={narrowOnly.includes(item) ? "min-[1440px]:hidden" : undefined}
                  >
                    <Link
                      href={item.href}
                      aria-current={isActive(item.href) ? "page" : undefined}
                      className={`block px-4 py-2.5 text-sm transition-colors hover:bg-surface ${
                        isActive(item.href) ? "font-medium text-ink" : "text-muted"
                      }`}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </nav>

        <div data-header-actions className="ml-auto flex items-center gap-2 xl:ml-0">
          {/* Поиск значком, без поля: поле в шапке съедало место, которое
              нужнее рубрикам, а страница поиска всё равно своя. На самых
              узких телефонах поиск и вход прячем: они есть в меню, а
              шапка иначе вылезала вбок. */}
          <Link
            href={`/${lang}/search`}
            title={dict.nav.search}
            className="hidden h-11 w-11 min-[380px]:flex items-center justify-center rounded-xs border border-border transition-colors hover:bg-surface"
          >
            <Search className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">{dict.nav.search}</span>
          </Link>

          {/* Версия для слабовидящих. На телефоне места в шапке нет — там
              кнопка в меню. */}
          <button
            type="button"
            onClick={() => setIsLowVisionOpen((value) => !value)}
            aria-expanded={isLowVisionOpen}
            title={dict.lowVision.open}
            data-low-vision-trigger
            className="hidden h-11 w-11 items-center justify-center rounded-xs border border-border transition-colors hover:bg-surface md:flex"
          >
            <Eye className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">{dict.lowVision.open}</span>
          </button>

          <LanguageSwitcher
            current={lang}
            label={dict.nav.language}
            soonLabel={dict.nav.languageSoon}
          />

          {/* На телефонах уже 420 кнопки нет вовсе — она есть в меню, а с
              названием «MediaMap.kg» шапка на 390 вылезала вбок.
              Подпись прячем до 1440: значка хватает, а место в шапке дороже.
              С xl, как раньше, на кыргызском подпись выталкивала красную
              кнопку из строки, и та ломалась на три строки. */}
          <Link
            href={personalHref}
            className="hidden h-11 items-center gap-2 rounded-xs border border-border px-3 text-sm transition-colors hover:bg-surface min-[420px]:flex"
            title={account ? account.name : personalLabel}
          >
            {account ? (
              <UserRound className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Inbox className="h-4 w-4" aria-hidden="true" />
            )}
            <span className="sr-only min-[1440px]:not-sr-only min-[1440px]:whitespace-nowrap">{personalLabel}</span>
          </Link>

          <Link
            href={`/${lang}/report`}
            data-header-report
            className="hidden h-11 shrink-0 items-center rounded-xs bg-signal px-4 text-sm font-medium whitespace-nowrap text-surface transition-colors hover:bg-signal-deep sm:flex"
          >
            {dict.nav.report}
          </Link>

          <button
            ref={menuButtonRef}
            data-header-menu-button
            type="button"
            onClick={() => setIsOpen((value) => !value)}
            aria-expanded={isOpen}
            aria-label={isOpen ? dict.nav.close : dict.nav.menu}
            className="flex h-11 w-11 items-center justify-center rounded-xs border border-border xl:hidden"
          >
            {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {isOpen ? (
        // Меню внутри прилипшей шапки само не прокручивается: крупным
        // шрифтом нижние пункты уходили за экран, и дотянуться до них было
        // нельзя. Поэтому высота — не больше экрана под шапкой.
        <nav
          data-header-menu
          className="max-h-[calc(100dvh-4rem)] overflow-y-auto border-t border-line bg-paper xl:hidden"
        >
          <ul className="mx-auto max-w-[1400px] px-4 py-2 sm:px-6">
            {items.map((item) => (
              <li key={item.href} className="border-b border-line">
                <Link
                  href={item.href}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={`block py-3.5 text-base ${
                    isActive(item.href) ? "font-medium text-signal" : ""
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            ))}
            <li className="border-b border-line">
              <Link
                href={`/${lang}/search`}
                className="flex items-center gap-2 py-3.5 text-base"
              >
                <Search className="h-4 w-4" aria-hidden="true" />
                {dict.nav.search}
              </Link>
            </li>
            <li className="border-b border-line">
              <Link
                href={personalHref}
                className="flex items-center gap-2 py-3.5 text-base"
              >
                {account ? (
                  <UserRound className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Inbox className="h-4 w-4" aria-hidden="true" />
                )}
                {personalLabel}
              </Link>
            </li>
            <li className="border-b border-line">
              {/* Меню закрываем: панель встаёт на его место под шапкой. */}
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setIsLowVisionOpen(true);
                }}
                data-low-vision-trigger
                className="flex w-full items-center gap-2 py-3.5 text-left text-base"
              >
                <Eye className="h-4 w-4" aria-hidden="true" />
                {dict.lowVision.open}
              </button>
            </li>

            <li className="py-3">
              <Link
                href={`/${lang}/report`}
                className="flex h-12 items-center justify-center rounded-xs bg-signal px-4 text-base font-medium text-surface"
              >
                {dict.nav.report}
              </Link>
            </li>
          </ul>
        </nav>
      ) : null}

      {isLowVisionOpen ? (
        <LowVisionPanel
          dict={dict.lowVision}
          onClose={() => setIsLowVisionOpen(false)}
          fallbackFocus={menuButtonRef}
        />
      ) : null}
    </header>
  );
}
