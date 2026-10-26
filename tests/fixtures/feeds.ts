// Ленты для тестов сборщика — в том виде, в каком их присылают издания:
// с CDATA, мнемониками, HTML в описании, без guid, с Atom-ссылкой в
// атрибуте.

export const RSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>24.kg</title>
    <item>
      <title>ЧМ&amp;nbsp;по&amp;nbsp;футболу: язык вражды в комментариях</title>
      <link>https://24.kg/sport/1</link>
      <guid>24kg-1</guid>
      <description><![CDATA[<p>Болельщики <b>оскорбляли</b> игроков&nbsp;сборной.</p>]]></description>
      <pubDate>Mon, 26 Oct 2026 08:00:00 +0600</pubDate>
    </item>
    <item>
      <title><![CDATA[Мошенничество с картами: новая схема]]></title>
      <link>https://24.kg/crime/2</link>
      <pubDate>Sun, 25 Oct 2026 10:00:00 +0600</pubDate>
    </item>
    <item>
      <title>2026</title>
      <link>https://24.kg/numbers/3</link>
      <guid>24kg-3</guid>
      <dc:date>2026-10-24T10:00:00+06:00</dc:date>
    </item>
    <item>
      <title>Без ссылки — пропускается</title>
      <guid>24kg-4</guid>
    </item>
    <item>
      <title>Дата непонятная</title>
      <link>https://24.kg/x/5</link>
      <pubDate>вчера вечером</pubDate>
    </item>
  </channel>
</rss>`;

export const ATOM = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Kloop</title>
  <entry>
    <title type="html">Фейк о &laquo;новом налоге&raquo; разошёлся по соцсетям</title>
    <link rel="self" href="https://kloop.kg/feed/1"/>
    <link rel="alternate" href="https://kloop.kg/2026/10/fake-tax"/>
    <id>tag:kloop.kg,2026:1</id>
    <published>2026-10-25T12:00:00Z</published>
    <summary>Проверили &#171;документ&#187;.</summary>
  </entry>
</feed>`;

/** Лента с одной заметкой — частый случай: fast-xml-parser отдаёт объект, а не массив. */
export const RSS_SINGLE = `<?xml version="1.0"?>
<rss version="2.0"><channel><title>One</title>
  <item>
    <title>Единственная заметка</title>
    <link>https://example.kg/1</link>
    <guid>one-1</guid>
    <pubDate>Mon, 26 Oct 2026 08:00:00 +0600</pubDate>
  </item>
</channel></rss>`;
