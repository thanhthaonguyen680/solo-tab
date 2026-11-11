"use client";

import { useId, useState } from "react";
import { buttonPrimary, buttonSecondary, inputClass } from "@/app/admin/ui";
import { collections } from "@/config/site";
import { LEVELS } from "@/lib/song-model";
import { submitContribution } from "./actions";

/** Thông tin bài + nút gửi — dùng chung cho tab "Tải file lên" và "Tự soạn tab" */
export function ContributionForm({
  notation,
  tempo,
  defaultTitle = "",
  defaultArtist = "",
  cancelLabel = "Huỷ",
  onCancel,
  onSent,
}: {
  notation: string;
  tempo: number | null;
  defaultTitle?: string;
  defaultArtist?: string;
  cancelLabel?: string;
  onCancel: () => void;
  onSent: (title: string) => void;
}) {
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
    }).catch(() => ({ ok: false as const, error: "Không gửi được — kiểm tra mạng rồi thử lại." }));
    setSending(false);
    if (!result.ok) return setError(result.error);
    onSent(result.title);
  }

  return (
    <form action={onSubmit} className="grid gap-4 rounded-xl border border-line bg-bg p-4 sm:grid-cols-2" aria-label="Thông tin bài">
      <Field label="Tên bài *" id={id("title")} className="sm:col-span-2">
        <input id={id("title")} name="title" required maxLength={200} defaultValue={defaultTitle} className={inputClass} />
      </Field>
      <Field label="Ca sĩ / tác giả bài hát" id={id("artist")}>
        <input id={id("artist")} name="artist" maxLength={200} defaultValue={defaultArtist} className={inputClass} />
      </Field>
      <Field label="Tên bạn (tuỳ chọn)" id={id("name")} hint="Hiện là người soạn tab trên trang bài">
        <input id={id("name")} name="name" maxLength={60} autoComplete="nickname" className={inputClass} />
      </Field>
      <Field label="Kho" id={id("collection")}>
        <select id={id("collection")} name="collection" defaultValue="melody" className={inputClass}>
          {Object.values(collections).map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.title}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Độ khó" id={id("level")}>
        <select id={id("level")} name="level" defaultValue="Vừa" className={inputClass}>
          {LEVELS.map((l) => (
            <option key={l}>{l}</option>
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
        <span>
          <b>Tôi tự soạn tab này</b> (hoặc được người soạn cho phép đăng). Tab có thể bị gỡ nếu chủ sở hữu bản quyền yêu cầu.
        </span>
      </label>
      {error && (
        <p role="alert" className="rounded-xl border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-300 sm:col-span-2">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2 sm:col-span-2">
        <button type="submit" disabled={sending} className={buttonPrimary}>
          {sending ? "Đang gửi…" : "Gửi đóng góp"}
        </button>
        <button type="button" onClick={onCancel} disabled={sending} className={buttonSecondary}>
          {cancelLabel}
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
