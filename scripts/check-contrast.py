# -*- coding: utf-8 -*-
"""Проверяет пары «текст на фоне» по WCAG 2.1.

На прежнем сайте двадцать пар не добирали до нормы, причём серый
rgb(110,121,121) промахивался на сотую долю — глазом такое не поймать.
Поэтому палитра проверяется числами до того, как попадёт в стили.

Норма AA: 4.5 для обычного текста, 3.0 для крупного (от 18.66px жирного
или 24px обычного) и для границ элементов управления.

Каждая пара проверяется трижды: на обычном сайте и в двух схемах версии
для слабовидящих. Схемы подменяют те же токены (globals.css, блоки
html[data-a11y-scheme]), поэтому и пары у них те же самые.

Запуск: python scripts/check-contrast.py
"""

PALETTE = {
    "paper":       "#F2F4F3",
    "surface":     "#FFFFFF",
    "ink":         "#101615",
    "display":     "#2B3735",
    "muted":       "#59635F",
    "line":        "#D5DCD9",
    "border":      "#848D8A",
    "deep":        "#1B2C47",
    "deep_grey":   "#2E3532",
    "signal":      "#B3122A",
    "hate":        "#5A3E85",
    "disinfo":     "#1F5673",
    "fraud":       "#8A5710",
    "other":       "#4F5956",
    "trust_low":   "#A33A1F",
    "trust_mid":   "#8A6A12",
    "trust_high":  "#2F6B4F",
}

# Версия для слабовидящих: только то, что схема меняет. Значения обязаны
# совпадать с globals.css — расхождение тут значит, что проверяли не то.
SCHEMES = {
    "обычная": {},
    "чёрным по белому": {
        "paper":      "#FFFFFF",
        "surface":    "#FFFFFF",
        "ink":        "#000000",
        "display":    "#000000",
        "muted":      "#1F1F1F",
        "line":       "#6B6B6B",
        "border":     "#000000",
        "deep":       "#000000",
        "deep_grey":  "#000000",
        "signal":     "#9E0019",
        "hate":       "#4A2D75",
        "disinfo":    "#133F58",
        "fraud":      "#663D05",
        "other":      "#333333",
        "trust_low":  "#82250F",
        "trust_mid":  "#5E4700",
        "trust_high": "#1B5236",
    },
    "белым по чёрному": {
        "paper":      "#000000",
        "surface":    "#000000",
        "ink":        "#FFFFFF",
        "display":    "#FFFFFF",
        "muted":      "#E0E0E0",
        "line":       "#8C8C8C",
        "border":     "#FFFFFF",
        "deep":       "#FFD60A",
        "deep_grey":  "#FFD60A",
        "signal":     "#FFD60A",
        "hate":       "#C9B0FF",
        "disinfo":    "#85CDF2",
        "fraud":      "#F2BD66",
        "other":      "#CCCCCC",
        "trust_low":  "#FF9E85",
        "trust_mid":  "#F5D061",
        "trust_high": "#7DD8AB",
    },
}

# (текст, фон, требуемый минимум, где применяется)
PAIRS = [
    ("ink",        "paper",   4.5, "основной текст"),
    ("display",    "paper",   4.5, "заголовки на бумаге"),
    ("display",    "surface", 4.5, "заголовки на карточке"),
    ("ink",        "surface", 4.5, "текст в карточке"),
    ("muted",      "paper",   4.5, "подписи и метаданные"),
    ("muted",      "surface", 4.5, "метаданные в карточке"),
    ("signal",     "paper",   4.5, "ссылки и действия"),
    ("signal",     "surface", 4.5, "ссылки в карточке"),
    ("hate",       "surface", 4.5, "вид: язык вражды"),
    ("disinfo",    "surface", 4.5, "вид: дезинформация"),
    ("fraud",      "surface", 4.5, "вид: цифровое мошенничество"),
    ("other",      "surface", 4.5, "нейтральный вид"),
    ("surface",    "hate",    4.5, "число на столбике вида"),
    ("surface",    "disinfo", 4.5, "число на столбике вида"),
    ("surface",    "fraud",   4.5, "число на столбике вида"),
    ("surface",    "other",   4.5, "число на столбике вида"),
    ("trust_low",  "surface", 4.5, "уверенность: низкая"),
    ("trust_mid",  "surface", 4.5, "уверенность: средняя"),
    ("trust_high", "surface", 4.5, "уверенность: высокая"),
    ("surface",    "signal",  4.5, "белый текст на кнопке"),
    ("surface",    "deep",    4.5, "белый текст на плашке призыва"),
    ("surface",    "deep_grey", 4.5, "то же, серый вариант"),
    ("deep",       "surface", 4.5, "надпись на белой кнопке призыва"),
    ("surface",    "ink",     4.5, "белый текст на тёмном"),
    ("border",     "paper",   3.0, "рамки полей и кнопок"),
    ("border",     "surface", 3.0, "рамки полей в карточке"),
]

# `line` сюда намеренно не входит. Это волосяной разделитель между блоками:
# критерий 1.4.11 распространяется на границы элементов управления и на
# графику, несущую смысл, а декоративная линейка под требование не подпадает.
# Всё, что можно нажать, обязано использовать `border`.


def luminance(hex_color):
    hex_color = hex_color.lstrip("#")
    channels = []
    for i in (0, 2, 4):
        c = int(hex_color[i:i + 2], 16) / 255
        channels.append(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4)
    r, g, b = channels
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def ratio(fg, bg):
    a, b = luminance(fg), luminance(bg)
    lighter, darker = max(a, b), min(a, b)
    return (lighter + 0.05) / (darker + 0.05)


def main():
    failures = 0
    for scheme, overrides in SCHEMES.items():
        palette = dict(PALETTE, **overrides)
        print("\nсхема: %s" % scheme)
        print("%-12s %-9s %7s %7s  %s" % ("текст", "фон", "факт", "норма", "применение"))
        print("-" * 72)
        for fg, bg, need, where in PAIRS:
            value = ratio(palette[fg], palette[bg])
            ok = value >= need
            if not ok:
                failures += 1
            print("%-12s %-9s %6.2f %7.1f  %s %s" % (
                fg, bg, value, need, "OK  " if ok else "МАЛО", where))

    print("-" * 72)
    if failures:
        print("не проходит пар: %d" % failures)
        raise SystemExit(1)
    print("все пары проходят WCAG AA")


if __name__ == "__main__":
    main()
