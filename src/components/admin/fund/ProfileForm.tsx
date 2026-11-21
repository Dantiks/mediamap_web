"use client";

import { useActionState } from "react";

import type { Localized } from "@/lib/fund-rules";
import { saveProfile, type FundState } from "@/server/fund-actions";
import LangFields from "./LangFields";

/** «О фонде» и контакты. Пустой блок на сайте просто не показывается. */
export default function ProfileForm(props: {
  about: Localized;
  address: Localized;
  email: string;
  phone: string;
  links: string;
}) {
  const [state, run, pending] = useActionState<FundState, FormData>(saveProfile, {});

  return (
    <form action={run} className="fund-form">
      <LangFields
        name="about"
        label="О фонде"
        value={props.about}
        multiline
        rows={8}
        placeholder="Кто мы и чем занимаемся. Абзацы разделяйте пустой строкой."
      />

      <fieldset>
        <legend>Контакты</legend>
        <div className="row">
          <label>
            Почта:
            <br />
            <input type="email" name="email" size={32} defaultValue={props.email} />
          </label>
          <label>
            Телефон:
            <br />
            <input type="tel" name="phone" size={24} maxLength={40} defaultValue={props.phone} placeholder="+996 …" />
          </label>
        </div>
      </fieldset>

      <LangFields name="address" label="Адрес" value={props.address} maxLength={200} />

      <label>
        Сайт и соцсети — по ссылке на строку, подпись через пробел:
        <br />
        <textarea
          name="links"
          rows={4}
          cols={80}
          defaultValue={props.links}
          placeholder={"https://facebook.com/… Facebook\nhttps://instagram.com/… Instagram"}
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
