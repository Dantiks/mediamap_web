-- Подкасты Govori.TV о пропаганде, фейках и медиаграмотности — в раздел
-- «Видео» кыргызской версии. Все кыргызоязычные, поэтому lang = 'ky'.
-- Показываются плеером YouTube (поле youtubeId, см. схему): по часу каждый,
-- файлом в 50 МБ они не помещаются. 1280×720 — чтобы карточка была широкой.
-- Повторный запуск ничего не задвоит: ролик с тем же youtubeId пропускается.

INSERT INTO "videos" ("title", "lang", "youtubeId", "seconds", "width", "height", "sourceUrl", "position", "createdAt")
SELECT 'Адиль Турдукулов менен подкаст: Кыргызстан коңшу мамлекеттердин авторитардык жолун кайталап баратат', 'ky', 'XH8XZ5aXjUA', 3841, 1280, 720, 'https://www.youtube.com/watch?v=XH8XZ5aXjUA', 0, strftime('%Y-%m-%dT%H:%M:%f+00:00', 'now')
WHERE NOT EXISTS (SELECT 1 FROM "videos" WHERE "youtubeId" = 'XH8XZ5aXjUA');

INSERT INTO "videos" ("title", "lang", "youtubeId", "seconds", "width", "height", "sourceUrl", "position", "createdAt")
SELECT 'Табылды Акеров менен подкаст: Кичинекей бир эле нерсе шайлоо процессин буруп салышы мүмкүн', 'ky', 'US0HdeHhFlA', 4178, 1280, 720, 'https://youtu.be/US0HdeHhFlA', 1, strftime('%Y-%m-%dT%H:%M:%f+00:00', 'now')
WHERE NOT EXISTS (SELECT 1 FROM "videos" WHERE "youtubeId" = 'US0HdeHhFlA');

INSERT INTO "videos" ("title", "lang", "youtubeId", "seconds", "width", "height", "sourceUrl", "position", "createdAt")
SELECT 'Гульзада Станалиева менен подкаст: Блогерлер биздин ойго кантип таасир этет?', 'ky', 'k61Fx5oEoOI', 4125, 1280, 720, 'https://youtu.be/k61Fx5oEoOI', 2, strftime('%Y-%m-%dT%H:%M:%f+00:00', 'now')
WHERE NOT EXISTS (SELECT 1 FROM "videos" WHERE "youtubeId" = 'k61Fx5oEoOI');

INSERT INTO "videos" ("title", "lang", "youtubeId", "seconds", "width", "height", "sourceUrl", "position", "createdAt")
SELECT 'Элира Турдубаева менен подкаст: Кыргызстандыктар көз карандысыз медиа керек деп талап кылбай калды', 'ky', '8NKhOrv1y0A', 3994, 1280, 720, 'https://www.youtube.com/watch?v=8NKhOrv1y0A', 3, strftime('%Y-%m-%dT%H:%M:%f+00:00', 'now')
WHERE NOT EXISTS (SELECT 1 FROM "videos" WHERE "youtubeId" = '8NKhOrv1y0A');

INSERT INTO "videos" ("title", "lang", "youtubeId", "seconds", "width", "height", "sourceUrl", "position", "createdAt")
SELECT 'Пропаганданын таасири. Кыргызстанда дүйнөдө болуп жаткан окуяларды башка өлкөнүн көзү менен карашат', 'ky', 'B4t2FVfA8eE', 4011, 1280, 720, 'https://youtu.be/B4t2FVfA8eE', 4, strftime('%Y-%m-%dT%H:%M:%f+00:00', 'now')
WHERE NOT EXISTS (SELECT 1 FROM "videos" WHERE "youtubeId" = 'B4t2FVfA8eE');

INSERT INTO "videos" ("title", "lang", "youtubeId", "seconds", "width", "height", "sourceUrl", "position", "createdAt")
SELECT 'Санжар Эралиев менен подкаст: «Аялдын көйгөйүн аял эле сүйлөй берсе, эркекке жетпейт»', 'ky', 'HCmtYGagxYk', 4208, 1280, 720, 'https://youtu.be/HCmtYGagxYk', 5, strftime('%Y-%m-%dT%H:%M:%f+00:00', 'now')
WHERE NOT EXISTS (SELECT 1 FROM "videos" WHERE "youtubeId" = 'HCmtYGagxYk');

INSERT INTO "videos" ("title", "lang", "youtubeId", "seconds", "width", "height", "sourceUrl", "position", "createdAt")
SELECT 'Назира Жусупова менен маек: Калптын казаны кайнап калды. Фейктерге туруштук эмнеге берилбей жатат?', 'ky', 'cRDom90g1Wc', 3153, 1280, 720, 'https://govori.tv/nazira-zhusupova-menen-maek-kalptyn-kazany-kajnap-kaldy-fejkterge-turushtuk-emnege-berilbej-zhatat/', 6, strftime('%Y-%m-%dT%H:%M:%f+00:00', 'now')
WHERE NOT EXISTS (SELECT 1 FROM "videos" WHERE "youtubeId" = 'cRDom90g1Wc');

INSERT INTO "videos" ("title", "lang", "youtubeId", "seconds", "width", "height", "sourceUrl", "position", "createdAt")
SELECT 'Асель Сооронбаева менен подкаст: Медиасабаттуулук — коопсуздуктун куралы', 'ky', 'F0Xm0DYHoL4', 3244, 1280, 720, 'https://govori.tv/asel-sooronbaeva-menen-podkast-mediasabattuuluk-koopsuzduktun-kuraly/', 7, strftime('%Y-%m-%dT%H:%M:%f+00:00', 'now')
WHERE NOT EXISTS (SELECT 1 FROM "videos" WHERE "youtubeId" = 'F0Xm0DYHoL4');

INSERT INTO "videos" ("title", "lang", "youtubeId", "seconds", "width", "height", "sourceUrl", "position", "createdAt")
SELECT 'Эмил Жороев менен подкаст: Жалган маалымат менен пропагандага сугарылган эл такыр эч нерсеге ишенбей калат', 'ky', 'ZXzC59_Vin8', 3424, 1280, 720, 'https://govori.tv/emil-zhoroev-menen-podkast-zhalgan-maalymat-menen-propagandaga-sugarylgan-el-takyr-ech-nersege-ishenbej-kalat/', 8, strftime('%Y-%m-%dT%H:%M:%f+00:00', 'now')
WHERE NOT EXISTS (SELECT 1 FROM "videos" WHERE "youtubeId" = 'ZXzC59_Vin8');

INSERT INTO "videos" ("title", "lang", "youtubeId", "seconds", "width", "height", "sourceUrl", "position", "createdAt")
SELECT 'Бакыт Орунбеков менен подкаст: Маалымат күчтүү курал. Бул куралды ким, кандай колдонуп келет?', 'ky', 'irVBuFZqDf8', 3643, 1280, 720, 'https://govori.tv/bakyt-orunbekov-menen-podkast-maalymat-k-cht-kural-bul-kuraldy-kim-kandaj-koldonup-kelet/', 9, strftime('%Y-%m-%dT%H:%M:%f+00:00', 'now')
WHERE NOT EXISTS (SELECT 1 FROM "videos" WHERE "youtubeId" = 'irVBuFZqDf8');

INSERT INTO "videos" ("title", "lang", "youtubeId", "seconds", "width", "height", "sourceUrl", "position", "createdAt")
SELECT 'Нурдин Дүйшенбеков менен подкаст: Коркуу сезими пайда болду. Пропаганданын таасири', 'ky', 'xfRiZPZsskY', 3426, 1280, 720, 'https://govori.tv/nurdin-d-jshenbekov-menen-podkast-korkuu-sezimi-pajda-boldu-propagandanyn-taasiri/', 10, strftime('%Y-%m-%dT%H:%M:%f+00:00', 'now')
WHERE NOT EXISTS (SELECT 1 FROM "videos" WHERE "youtubeId" = 'xfRiZPZsskY');
