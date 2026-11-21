"use client";

import { useActionState, useState } from "react";

import type { Localized } from "@/lib/fund-rules";
import { saveProject, type FundState } from "@/server/fund-actions";
import LangFields from "./LangFields";

type Props = {
  id: number;
  title: Localized;
  description: Localized;
  partners: Localized;
  region: Localized;
  start: string;
  end: string;
  ongoing: boolean;
  links: string;
};

/** Тексты и сроки проекта. Файлы — отдельным блоком ниже, они грузятся сразу. */
export default function ProjectForm(props: Props) {
  const [state, run, pending] = useActionState<FundState, FormData>(saveProject, {});
  const [ongoing, setOngoing] = useState(props.ongoing);

  return (
    <form action={run} className="fund-form">
      <input type="hidden" name="id" value={props.id} />

      <LangFields name="title" label="Название" value={props.title} required maxLength={200} />

      <fieldset>
        <legend>Сроки</legend>
        <div className="row">
          <label>
            Начало:
            <br />
            <input type="month" name="start" defaultValue={props.start} />
          </label>
          <label>
            Окончание:
            <br />
            <input type="month" name="end" defaultValue={props.end} disabled={ongoing} />
          </label>
          <label className="check">
            <input
              type="checkbox"
              name="ongoing"
              checked={ongoing}
              onChange={(event) => setOngoing(event.target.checked)}
            />{" "}
            Идёт сейчас
          </label>
        </div>
        <p className="note">Месяц и год. Идущие проекты стоят на странице первыми.</p>
      </fieldset>

      <LangFields name="region" label="Регион или место" value={props.region} maxLength={150} placeholder="Ош, Жалал-Абад" />
      <LangFields name="partners" label="Донор и партнёры" value={props.partners} maxLength={500} placeholder="При поддержке …" />
      <LangFields
        name="description"
        label="Что сделали"
        value={props.description}
        multiline
        rows={10}
        placeholder={"Абзацы разделяйте пустой строкой."}
      />

      <label>
        Ссылки — по одной на строку, подпись через пробел после адреса:
        <br />
        <textarea
          name="links"
          rows={4}
          cols={80}
          defaultValue={props.links}
          placeholder={"https://youtu.be/… Видео с тренинга\nhttps://kaktus.media/… Публикация в СМИ"}
        />
      </label>

      <div className="actions">
        <button type="submit" className="primary" disabled={pending}>
          {pending ? "Сохраняю…" : "Сохранить"}
        </button>
        {state.error ? <span className="error">{state.error}</span> : null}
        {state.done ? <span className="note">{state.done}</span> : null}
      </div>
    </form>
  );
}
