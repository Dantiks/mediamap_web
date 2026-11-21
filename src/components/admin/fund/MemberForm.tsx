"use client";

import { useActionState } from "react";

import type { Localized } from "@/lib/fund-rules";
import { saveMember, type FundState } from "@/server/fund-actions";
import LangFields from "./LangFields";

/** Человек из команды: новый (без id) или правка существующего. */
export default function MemberForm({
  id,
  name = {},
  role = {},
}: {
  id?: number;
  name?: Localized;
  role?: Localized;
}) {
  const [state, run, pending] = useActionState<FundState, FormData>(saveMember, {});

  return (
    <form action={run} className="fund-form">
      {id ? <input type="hidden" name="id" value={id} /> : null}
      <LangFields name="name" label="Имя и фамилия" value={name} required maxLength={120} />
      <LangFields name="role" label="Должность" value={role} maxLength={150} />
      <label>
        {id ? "Заменить фото:" : "Фото:"}
        <br />
        <input type="file" name="photo" accept=".png,.jpg,.jpeg,.webp" />
      </label>
      <div className="actions">
        <button type="submit" className={id ? undefined : "primary"} disabled={pending}>
          {pending ? "Сохраняю…" : id ? "Сохранить" : "Добавить в команду"}
        </button>
        {state.error ? <span className="error">{state.error}</span> : null}
        {state.done ? <span className="note">{state.done}</span> : null}
      </div>
    </form>
  );
}
