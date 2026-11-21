/** Маленькая пометка языка у текста, который показан не на языке страницы. */
export default function LangTag({ note }: { note: string | null }) {
  if (!note) return null;
  return (
    <span className="ml-2 inline-block rounded-xs border border-line px-1.5 align-middle font-mono text-2xs text-muted">
      {note}
    </span>
  );
}
