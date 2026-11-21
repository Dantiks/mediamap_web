"use client";

import { useActionState } from "react";

import { saveLogo, type FundState } from "@/server/fund-actions";

export default function LogoForm() {
  const [state, run, pending] = useActionState<FundState, FormData>(saveLogo, {});

  return (
    <form action={run}>
      <label>
        Новый логотип (PNG с прозрачным фоном лучше всего):
        <br />
        <input type="file" name="logo" accept=".png,.jpg,.jpeg,.webp" required />
      </label>
      <button type="submit" disabled={pending}>
        {pending ? "Загружаю…" : "Заменить логотип"}
      </button>
      {state.error ? <p className="error">{state.error}</p> : null}
      {state.done ? <p className="note">{state.done}</p> : null}
    </form>
  );
}
