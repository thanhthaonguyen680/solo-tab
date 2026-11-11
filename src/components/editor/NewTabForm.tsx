"use client";

import { useState } from "react";
import { encodeScoreFile } from "@/lib/notation-format";
import { GRIDS, NEW_TAB_LIMITS, TIME_SIGNATURES, TUNINGS, newTabTex } from "@/lib/new-tab";
import { buttonPrimary, buttonSecondary, inputClass } from "@/app/admin/ui";
import type { Lang } from "@/i18n";
import { editorText } from "./editor-i18n";

/**
 * Chọn cách lên dây, capo, tempo, nhịp, số ô → dựng tab trống (Guitar Pro 7) để mở trình soạn.
 * Dùng chung cho admin ("Tạo tab mới") và trang đóng góp ("Tự soạn tab").
 */
export function NewTabForm({
  title = "",
  defaultBpm,
  note,
  submitLabel,
  lang = "vi",
  contribute = false,
  onCreated,
  onCancel,
}: {
  title?: string;
  defaultBpm?: number;
  /** Dòng nhắc phía trên form */
  note?: React.ReactNode;
  submitLabel?: string;
  lang?: Lang;
  /** Trang đóng góp: hỏi tên bài + tác giả (hiện trên khung nhạc), bắt đầu với 1 ô — soạn tới đâu thêm ô tới đó */
  contribute?: boolean;
  onCreated: (notation: string, bpm: number, song: { title: string; artist: string }) => void;
  onCancel?: () => void;
}) {
  const t = editorText[lang].newTab;
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string>();

  async function onCreate(form: FormData) {
    setError(undefined);
    setCreating(true);
    try {
      const alphaTab = await import("@coderline/alphatab");
      const bpm = Number(form.get("bpm"));
      const song = contribute
        ? { title: String(form.get("songTitle") ?? "").trim(), artist: String(form.get("songArtist") ?? "").trim() }
        : { title, artist: "" };
      const tex = newTabTex({
        title: song.title,
        artist: song.artist,
        tuning: String(form.get("tuning")),
        capo: Number(form.get("capo")),
        bpm,
        timeSignature: String(form.get("ts")),
        bars: contribute ? 1 : Number(form.get("bars")),
        grid: Number(form.get("grid")),
      });
      const settings = new alphaTab.Settings();
      const score = alphaTab.importer.ScoreLoader.loadAlphaTex(tex, settings);
      const bytes = new alphaTab.exporter.Gp7Exporter().export(score, settings);
      onCreated(encodeScoreFile(bytes, 0), score.tempo || bpm, song);
    } catch (e) {
      console.error("Tạo tab mới:", e);
      setError(t.error);
    } finally {
      setCreating(false);
    }
  }

  return (
    <form action={onCreate} className="flex flex-col gap-4 rounded-xl border border-line bg-bg p-4" aria-label={t.region}>
      {note && <p className="rounded-lg border border-dashed border-border px-3 py-2 text-sm text-muted">{note}</p>}
      {contribute && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t.songTitle} htmlFor="nt-song-title">
            <input id="nt-song-title" name="songTitle" required maxLength={200} className={inputClass} />
          </Field>
          <Field label={t.songArtist} htmlFor="nt-song-artist">
            <input id="nt-song-artist" name="songArtist" maxLength={200} className={inputClass} />
          </Field>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label={t.tuning} htmlFor="nt-tuning">
          <select id="nt-tuning" name="tuning" defaultValue="standard" className={inputClass}>
            {TUNINGS.map((tu) => (
              <option key={tu.id} value={tu.id}>{t.tunings[tu.id] ?? tu.label}</option>
            ))}
          </select>
        </Field>
        <Field label={t.capo} htmlFor="nt-capo">
          <input id="nt-capo" name="capo" type="number" min={NEW_TAB_LIMITS.capo[0]} max={NEW_TAB_LIMITS.capo[1]} defaultValue={0} className={inputClass} />
        </Field>
        <Field label={t.tempo} htmlFor="nt-bpm">
          <input id="nt-bpm" name="bpm" type="number" min={NEW_TAB_LIMITS.bpm[0]} max={NEW_TAB_LIMITS.bpm[1]} defaultValue={defaultBpm ?? 80} className={inputClass} />
        </Field>
        <Field label={t.timeSignature} htmlFor="nt-ts">
          <select id="nt-ts" name="ts" defaultValue="4/4" className={inputClass}>
            {TIME_SIGNATURES.map((ts) => (
              <option key={ts.id} value={ts.id}>{ts.id}</option>
            ))}
          </select>
        </Field>
        {!contribute && (
          <Field label={t.bars} htmlFor="nt-bars" hint={t.barsHint}>
            <input id="nt-bars" name="bars" type="number" min={NEW_TAB_LIMITS.bars[0]} max={NEW_TAB_LIMITS.bars[1]} defaultValue={8} className={inputClass} />
          </Field>
        )}
        <Field label={t.grid} htmlFor="nt-grid" hint={t.gridHint}>
          <select id="nt-grid" name="grid" defaultValue="8" className={inputClass}>
            {GRIDS.map((g) => (
              <option key={g.value} value={g.value}>{t.grids[g.value] ?? g.label}</option>
            ))}
          </select>
        </Field>
      </div>
      {error && <p role="alert" className="text-sm font-medium text-red-400">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={creating} className={buttonPrimary}>
          {creating ? t.creating : (submitLabel ?? t.create)}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className={buttonSecondary}>
            {t.cancel}
          </button>
        )}
      </div>
    </form>
  );
}

function Field({ label, htmlFor, hint, children }: { label: string; htmlFor: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-semibold">{label}</label>
      {children}
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}
