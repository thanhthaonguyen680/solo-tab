"use client";

import { useId, useState } from "react";
import { buttonPrimary, buttonSecondary, inputClass } from "@/app/admin/ui";
import { collections } from "@/config/site";
import { dict, type Lang } from "@/i18n";
import { submitContribution } from "@/lib/contribute-actions";
import { LEVELS } from "@/lib/song-model";
import { contributeText } from "./contribute-i18n";

/** Thông tin bài + nút gửi — dùng chung cho tab "Tải file lên" và "Tự soạn tab" */
export function ContributionForm({
  notation,
  tempo,
  defaultTitle = "",
  defaultArtist = "",
  cancelLabel,
  lang,
  onCancel,
  onSent,
}: {
  notation: string;
  tempo: number | null;
  defaultTitle?: string;
  defaultArtist?: string;
  cancelLabel?: string;
  lang: Lang;
  onCancel: () => void;
  onSent: (title: string) => void;
}) {
  const t = contributeText[lang].form;
  const uid = useId(); // form có thể hiện ở cả 2 tab cùng lúc → id phải khác nhau
  const id = (name: string) => `${uid}-${name}`;
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string>();

  async function onSubmit(form: FormData) {
    setError(undefined);
    setSending(true);
    const result = await submitContribution({
      title: String(form.get("title") ?? ""),
      artist: String(form.get("artist") ?? ""),
      name: String(form.get("name") ?? ""),
      collection: String(form.get("collection") ?? ""),
      level: String(form.get("level") ?? ""),
      notation,
      tempo,
      rights: form.get("rights") === "on",
      website: String(form.get("website") ?? ""),
    }, lang).catch(() => ({ ok: false as const, error: t.network }));
    setSending(false);
    if (!result.ok) return setError(result.error);
    onSent(result.title);
  }

  return (
    <form action={onSubmit} className="grid gap-4 rounded-xl border border-line bg-bg p-4 sm:grid-cols-2" aria-label={t.region}>
      <Field label={t.title} id={id("title")} className="sm:col-span-2">
        <input id={id("title")} name="title" required maxLength={200} defaultValue={defaultTitle} className={inputClass} />
      </Field>
      <Field label={t.artist} id={id("artist")}>
        <input id={id("artist")} name="artist" maxLength={200} defaultValue={defaultArtist} className={inputClass} />
      </Field>
      <Field label={t.name} id={id("name")} hint={t.nameHint}>
        <input id={id("name")} name="name" maxLength={60} autoComplete="nickname" className={inputClass} />
      </Field>
      <Field label={t.collection} id={id("collection")}>
        <select id={id("collection")} name="collection" defaultValue="melody" className={inputClass}>
          {Object.values(collections).map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.title}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t.level} id={id("level")}>
        <select id={id("level")} name="level" defaultValue="Vừa" className={inputClass}>
          {LEVELS.map((l) => (
            <option key={l} value={l}>
              {dict[lang].level[l]}
            </option>
          ))}
        </select>
      </Field>
      {/* Bẫy bot: người dùng không thấy ô này */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor={id("website")}>Website</label>
        <input id={id("website")} name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <label className="flex items-start gap-3 rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm sm:col-span-2">
        <input type="checkbox" name="rights" required className="mt-0.5 size-5 shrink-0 accent-[var(--accent-ink)]" />
        <span>{t.rights}</span>
      </label>
      {error && (
        <p role="alert" className="rounded-xl border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-300 sm:col-span-2">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2 sm:col-span-2">
        <button type="submit" disabled={sending} className={buttonPrimary}>
          {sending ? t.sending : t.submit}
        </button>
        <button type="button" onClick={onCancel} disabled={sending} className={buttonSecondary}>
          {cancelLabel ?? t.cancel}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  id,
  hint,
  className = "",
  children,
}: {
  label: string;
  id: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="text-sm font-bold">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}
