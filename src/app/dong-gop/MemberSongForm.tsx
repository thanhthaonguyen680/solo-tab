"use client";

import Link from "next/link";
import { useActionState } from "react";
import { buttonPrimary, buttonSecondary, FieldError, inputClass } from "@/app/admin/ui";
import { collections } from "@/config/site";
import { LEVELS, type Song } from "@/lib/song-model";
import type { SubmissionFormState } from "./actions";

type Props = {
  song?: Song;
  action: (prev: SubmissionFormState, form: FormData) => Promise<SubmissionFormState>;
};

/** Thông tin bài của thành viên: tên, tác giả, kho, độ khó, tông, tempo, tag (+ cam kết bản quyền khi tạo mới) */
export function MemberSongForm({ song, action }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  const v = (name: string, fallback: string | number | undefined) =>
    state.values ? (state.values[name] ?? "") : (fallback?.toString() ?? "");
  const err = state.errors ?? {};
  const isNew = !song;

  return (
    <form key={state.attempt ?? 0} action={formAction} className="flex flex-col gap-5">
      {state.message && (
        <p role="alert" className="rounded-xl border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-300">
          {state.message}
        </p>
      )}
      {state.saved && (
        <p role="status" className="rounded-xl border border-accent/40 bg-fresh px-4 py-3 text-sm font-semibold text-accent-ink">
          ✓ Đã lưu thông tin bài.
        </p>
      )}

      <fieldset className="grid gap-4 rounded-2xl border border-border bg-surface p-5 sm:grid-cols-2">
        <legend className="sr-only">Thông tin bài</legend>
        <Field label="Tên bài *" name="title" error={err.title} className="sm:col-span-2">
          <input id="title" name="title" required maxLength={200} defaultValue={v("title", song?.title)} className={inputClass} />
        </Field>
        <Field label="Ca sĩ / tác giả bài hát" name="artist" error={err.artist}>
          <input id="artist" name="artist" maxLength={200} defaultValue={v("artist", song?.artist)} className={inputClass} />
        </Field>
        <Field label="Kho *" name="collection" error={err.collection}>
          <select id="collection" name="collection" required defaultValue={v("collection", song?.collection ?? "solo")} className={inputClass}>
            {Object.values(collections).map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.title} — {c.blurb}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Độ khó *" name="level" error={err.level}>
          <select id="level" name="level" required defaultValue={v("level", song?.level ?? "Vừa")} className={inputClass}>
            {LEVELS.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Tông" name="key" error={err.key}>
            <input id="key" name="key" maxLength={12} defaultValue={v("key", song?.key)} placeholder="Am" className={inputClass} />
          </Field>
          <Field label="Tempo (bpm)" name="bpm" error={err.bpm}>
            <input id="bpm" name="bpm" type="number" min={20} max={400} defaultValue={v("bpm", song?.bpm)} className={inputClass} />
          </Field>
        </div>
        <Field label="Tag" hint="Cách nhau bằng dấu phẩy: Fingerstyle, Intro, Ver. 2" name="tags" error={err.tags} className="sm:col-span-2">
          <input id="tags" name="tags" defaultValue={v("tags", song?.tags.join(", "))} className={inputClass} />
        </Field>

        {isNew && (
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label className="flex items-start gap-3 rounded-xl border border-border bg-surface-2 px-4 py-3">
              <input
                type="checkbox"
                name="rights"
                defaultChecked={state.values?.rights === "on"}
                className="mt-0.5 size-5 shrink-0 accent-[var(--accent-ink)]"
                aria-describedby="rights-error"
              />
              <span className="text-sm">
                <span className="font-bold">Tôi tự soạn tab này</span> (hoặc được người soạn cho phép đăng) và chịu trách nhiệm về
                nội dung. Tab có thể bị gỡ nếu chủ sở hữu bản quyền yêu cầu.
              </span>
            </label>
            <FieldError id="rights-error" message={err.rights} />
          </div>
        )}
      </fieldset>

      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={pending} className={buttonPrimary}>
          {pending ? "Đang lưu…" : isNew ? "Tạo bài và thêm tab →" : "Lưu thông tin"}
        </button>
        {isNew && (
          <Link href="/dong-gop" className={buttonSecondary}>
            Huỷ
          </Link>
        )}
      </div>
    </form>
  );
}

function Field({
  label,
  hint,
  name,
  error,
  className = "",
  children,
}: {
  label: string;
  hint?: string;
  name: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={name} className="text-sm font-bold">
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-muted">{hint}</p>}
      <FieldError id={`${name}-error`} message={error} />
    </div>
  );
}
