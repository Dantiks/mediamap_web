import { FUND_BASE_LANG, FUND_LANGS, type Localized } from "@/lib/fund-rules";
import { LANGUAGES } from "@/lib/i18n/languages";

/*
  Одно поле на каждом языке сайта.

  Фонд переводит тексты сам, машинного перевода нет. Русский обязателен:
  на языке, который не заполнили, посетитель увидит русский с пометкой.
  Поля идут столбиком по языкам, русский первым — так перевод пишется,
  глядя на оригинал прямо над ним.
*/

const languageName = (code: string) =>
  LANGUAGES.find((item) => item.code === code)?.name ?? code;

export default function LangFields({
  name,
  label,
  value = {},
  multiline = false,
  rows = 6,
  required = false,
  maxLength,
  placeholder,
}: {
  name: string;
  label: string;
  value?: Localized;
  multiline?: boolean;
  rows?: number;
  required?: boolean;
  maxLength?: number;
  placeholder?: string;
}) {
  return (
    <fieldset className="langs">
      <legend>{label}</legend>
      {FUND_LANGS.map((lang) => {
        const base = lang === FUND_BASE_LANG;
        const field = `${name}_${lang}`;
        const common = {
          name: field,
          defaultValue: value[lang] ?? "",
          required: required && base,
          maxLength,
          placeholder: base ? placeholder : undefined,
          lang,
        };
        return (
          <label key={lang}>
            <span className="note">
              {languageName(lang)}
              {base ? (required ? " — обязательно" : "") : " — если пусто, покажем русский"}
            </span>
            <br />
            {multiline ? <textarea rows={rows} cols={80} {...common} /> : <input size={70} {...common} />}
          </label>
        );
      })}
    </fieldset>
  );
}
