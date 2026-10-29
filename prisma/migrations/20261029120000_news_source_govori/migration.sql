-- Govori.TV — кыргызоязычное издание без RSS: собирается по карте сайта
-- (см. src/server/news-sitemap.ts). Строка добавляется, только если такого
-- адреса ещё нет; заведённое администратором не трогаем.
-- Даты — в том виде, в каком их пишет Prisma, иначе она их не прочтёт.
INSERT OR IGNORE INTO "news_sources" ("name", "feedUrl", "lang", "enabled", "takeAll", "createdAt", "updatedAt")
VALUES (
    'Govori.TV',
    'https://govori.tv/sitemap.xml',
    'ky',
    true,
    false,
    strftime('%Y-%m-%dT%H:%M:%f+00:00', 'now'),
    strftime('%Y-%m-%dT%H:%M:%f+00:00', 'now')
);
