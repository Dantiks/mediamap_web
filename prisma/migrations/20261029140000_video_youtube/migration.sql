-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_videos" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "lang" TEXT NOT NULL DEFAULT 'ru',
    "key" TEXT,
    "mime" TEXT,
    "size" INTEGER,
    "youtubeId" TEXT,
    "posterKey" TEXT,
    "seconds" INTEGER,
    "width" INTEGER,
    "height" INTEGER,
    "sourceUrl" TEXT,
    "draft" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_videos" ("createdAt", "draft", "height", "id", "key", "lang", "mime", "position", "posterKey", "published", "seconds", "size", "sourceUrl", "title", "width") SELECT "createdAt", "draft", "height", "id", "key", "lang", "mime", "position", "posterKey", "published", "seconds", "size", "sourceUrl", "title", "width" FROM "videos";
DROP TABLE "videos";
ALTER TABLE "new_videos" RENAME TO "videos";
CREATE INDEX "videos_lang_published_position_idx" ON "videos"("lang", "published", "position");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
