"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { LEVELS, slugify, type Song } from "@/lib/song-model";
import type { SongFormState } from "./actions";
import { buttonPrimary, buttonSecondary, FieldError, inputClass } from "./ui";

type Props = {
  song?: Song;
  /** Ngày mặc định cho bài mới (YYYY-MM-DD), tính ở server */
  today: string;
  action: (prev: SongFormState, form: FormData) => Promise<SongFormState>;
};

export function SongForm({ song, today, action }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  const [title, setTitle] = useState(song?.title ?? "");

  // Khi có lỗi, hiển thị lại đúng giá trị vừa gửi
  const v = (name: string, fallback: string | number | undefined) =>
    state.values ? (state.values[name] ?? "") : (fallback?.toString() ?? "");
  const err = state.errors ?? {};

  return (
    <form key={state.attempt ?? 0} action={formAction} className="flex flex-col gap-6">
      {state.message && (
        <p role="alert" className="rounded-xl border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-300">
          {state.message}
        </p>
      )}

      <fieldset className="grid gap-4 rounded-2xl border border-border bg-surface p-5 sm:grid-cols-2">
        <legend className="sr-only">Thông tin bài</legend>

        <Field label="Tên bài *" name="title" error={err.title} className="sm:col-span-2">
          <input
            id="title"
            name="title"
            required
            defaultValue={v("title", song?.title)}
            onChange={(e) => setTitle(e.target.value)}
            className={inputClass}
            {...invalid("title", err.title)}
          />
        </Field>

        <Field
          label="Đường dẫn"
          hint={song ? "Đổi đường dẫn sẽ làm link cũ không còn vào được" : "Để trống để tự tạo từ tên bài"}
          name="slug"
          error={err.slug}
        >
          <div className="flex items-center gap-1 font-mono text-sm">
            <span className="text-muted">solotab.site/</span>
            <input
              id="slug"
              name="slug"
              defaultValue={v("slug", song?.slug)}
              placeholder={slugify(title) || "ten-bai"}
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              className={inputClass}
              {...invalid("slug", err.slug)}
            />
          </div>
        </Field>

        <Field label="Tác giả / nguồn" name="artist" error={err.artist}>
          <input id="artist" name="artist" defaultValue={v("artist", song?.artist)} className={inputClass} />
        </Field>

        <Field label="Độ khó *" name="level" error={err.level}>
          <select
            id="level"
            name="level"
            required
            defaultValue={v("level", song?.level ?? "Vừa")}
            className={inputClass}
            {...invalid("level", err.level)}
          >
            {LEVELS.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Tông" name="key" error={err.key}>
            <input id="key" name="key" defaultValue={v("key", song?.key)} placeholder="Am" className={inputClass} />
          </Field>
          <Field label="Tempo (bpm)" hint="Tempo mặc định khi phát tab tương tác" name="bpm" error={err.bpm}>
            <input
              id="bpm"
              name="bpm"
              type="number"
              min={20}
              max={400}
              defaultValue={v("bpm", song?.bpm)}
              className={inputClass}
              {...invalid("bpm", err.bpm)}
            />
          </Field>
        </div>

        <Field label="Ngày thêm" hint="4 bài mới nhất được gắn nhãn “Mới”" name="addedAt" error={err.addedAt}>
          <input
            id="addedAt"
            name="addedAt"
            type="date"
            defaultValue={v("addedAt", song?.addedAt ?? today)}
            className={inputClass}
            {...invalid("addedAt", err.addedAt)}
          />
        </Field>

        <Field label="Tag" hint="Cách nhau bằng dấu phẩy: Fingerstyle, Intro, Ver. 2" name="tags" error={err.tags}>
          <input
            id="tags"
            name="tags"
            defaultValue={v("tags", song?.tags.join(", "))}
            className={inputClass}
            {...invalid("tags", err.tags)}
          />
        </Field>

        <Field label="Link audio mẫu" hint="https://… hoặc /audio/ten-file.mp3" name="audioUrl" error={err.audioUrl}>
          <input
            id="audioUrl"
            name="audioUrl"
            defaultValue={v("audioUrl", song?.audioUrl)}
            className={inputClass}
            {...invalid("audioUrl", err.audioUrl)}
          />
        </Field>

        <label className="flex items-center gap-3 self-end rounded-xl border border-border bg-surface-2 px-4 py-3 sm:col-span-2">
          <input
            type="checkbox"
            name="free"
            defaultChecked={state.values ? state.values.free === "on" : Boolean(song?.free)}
            className="size-5 accent-[var(--accent-ink)]"
          />
          <span>
            <span className="font-bold">Mở miễn phí</span>
            <span className="block text-sm text-muted">Ai cũng xem được tab, không cần gói thành viên</span>
          </span>
        </label>
      </fieldset>


      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={pending} className={buttonPrimary}>
          {pending ? "Đang lưu…" : song ? "Lưu thay đổi" : "Thêm bài"}
        </button>
        <Link href="/admin" className={buttonSecondary}>
          Huỷ
        </Link>
      </div>
    </form>
  );
}

function invalid(name: string, error?: string) {
  return error ? { "aria-invalid": true, "aria-describedby": `${name}-error` } : {};
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
