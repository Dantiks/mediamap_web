"use client";

import { useActionState } from "react";

import { createProject, type FundState } from "@/server/fund-actions";

/** Новый проект: только название, остальное — на странице проекта. */
export default function NewProjectForm() {
  const [state, run, pending] = useActionState<FundState, FormData>(createProject, {});

  return (
    <form action={run}>
      <label>
        Название проекта на русском:
        <br />
        <input name="title_ru" size={70} required maxLength={200} placeholder="Тренинг по проверке фактов для журналистов Оша" />
      </label>
      <button type="submit" className="primary" disabled={pending}>
        {pending ? "Создаю…" : "Создать черновик"}
      </button>
      {state.error ? <p className="error">{state.error}</p> : null}
    </form>
  );
}
