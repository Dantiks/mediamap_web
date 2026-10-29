-- Govori.TV отвечает серверу 403: адрес дата-центра у них закрыт. Пока
-- они не разрешат адрес или не включат RSS, источник выключен, чтобы
-- в панели не висела ежечасная ошибка. Включить обратно — галочкой в панели.
UPDATE "news_sources"
SET "enabled" = false,
    "updatedAt" = strftime('%Y-%m-%dT%H:%M:%f+00:00', 'now')
WHERE "feedUrl" = 'https://govori.tv/sitemap.xml';
