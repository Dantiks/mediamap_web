"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import {
  FUND_ACCEPT,
  FUND_CHUNK_BYTES,
  FUND_MAX_BYTES,
  fundRuleFor,
} from "@/lib/fund-rules";

/*
  Загрузка файлов в проект.

  Можно выбрать сразу несколько или перетащить их мышью. Файлы едут по
  одному, каждый кусками по 8 МБ (см. api/admin/fund/upload): так
  проходит файл до 100 МБ, и видно, сколько уже ушло. Оборвалась связь на
  куске — пробуем его ещё дважды, а не начинаем файл заново.
*/

type Item = {
  key: string;
  name: string;
  size: number;
  sent: number;
  state: "wait" | "send" | "done" | "error";
  error?: string;
};

const mb = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} МБ`;

export default function FundUploader({ projectId }: { projectId: number }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);

  const patch = (key: string, change: Partial<Item>) =>
    setItems((list) => list.map((item) => (item.key === key ? { ...item, ...change } : item)));

  async function sendOne(file: File, key: string) {
    if (!fundRuleFor(file.name)) {
      return patch(key, { state: "error", error: "такой тип файла не принимаем" });
    }
    if (file.size > FUND_MAX_BYTES) {
      return patch(key, { state: "error", error: "больше 100 МБ" });
    }
    if (file.size === 0) return patch(key, { state: "error", error: "пустой файл" });

    patch(key, { state: "send" });
    const upload = crypto.randomUUID();
    let offset = 0;
    let retries = 0;

    while (offset < file.size) {
      const chunk = file.slice(offset, offset + FUND_CHUNK_BYTES);
      const query = new URLSearchParams({
        project: String(projectId),
        upload,
        offset: String(offset),
        total: String(file.size),
        name: file.name,
      });

      let response: Response;
      try {
        response = await fetch(`/api/admin/fund/upload?${query}`, {
          method: "POST",
          body: chunk,
          headers: { "Content-Type": "application/octet-stream" },
        });
      } catch {
        if (++retries > 2) return patch(key, { state: "error", error: "нет связи с сервером" });
        continue;
      }

      const body = (await response.json().catch(() => ({}))) as {
        received?: number;
        error?: string;
        done?: boolean;
      };

      // Сервер говорит, сколько у него есть, — продолжаем с этого места.
      if (response.status === 409 && typeof body.received === "number") {
        if (++retries > 2) return patch(key, { state: "error", error: "загрузка сбилась" });
        offset = body.received;
        continue;
      }
      if (!response.ok) {
        return patch(key, { state: "error", error: body.error ?? `ошибка ${response.status}` });
      }

      retries = 0;
      offset = body.received ?? offset + chunk.size;
      patch(key, { sent: offset });
      if (body.done) break;
    }

    patch(key, { state: "done", sent: file.size });
    // Новый файл сразу появляется в списке ниже.
    router.refresh();
  }

  async function start(files: FileList | File[]) {
    const list = Array.from(files).map((file) => ({
      file,
      item: {
        key: crypto.randomUUID(),
        name: file.name,
        size: file.size,
        sent: 0,
        state: "wait" as const,
      },
    }));
    if (!list.length) return;

    setItems((old) => [...old.filter((item) => item.state !== "done"), ...list.map((entry) => entry.item)]);
    setBusy(true);
    for (const entry of list) await sendOne(entry.file, entry.item.key);
    setBusy(false);
    if (input.current) input.current.value = "";
  }

  return (
    <div
      className={`dropzone${over ? " over" : ""}`}
      onDragOver={(event) => {
        event.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setOver(false);
        if (!busy) void start(event.dataTransfer.files);
      }}
    >
      <p>
        <b>Перетащите файлы сюда</b> или{" "}
        <label className="inline">
          <input
            ref={input}
            type="file"
            multiple
            accept={FUND_ACCEPT}
            disabled={busy}
            onChange={(event) => event.target.files && void start(event.target.files)}
          />
        </label>
      </p>
      <p className="note">
        Фото (JPG, PNG, HEIC), видео (MP4, MOV), документы (PDF, Word, Excel,
        PowerPoint), архивы (ZIP, RAR, 7z). До 100 МБ каждый, можно сразу
        несколько. Программы загрузить нельзя.
      </p>

      {items.length ? (
        <ul className="queue">
          {items.map((item) => (
            <li key={item.key}>
              <span className="url">{item.name}</span>{" "}
              <span className="note">
                {item.state === "wait" && "ждёт очереди"}
                {item.state === "send" && `${mb(item.sent)} из ${mb(item.size)}`}
                {item.state === "done" && "загружен"}
              </span>
              {item.state === "error" ? <span className="error"> — {item.error}</span> : null}
              {item.state === "send" ? (
                <progress max={item.size} value={item.sent} />
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
