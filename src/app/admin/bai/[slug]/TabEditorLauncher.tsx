"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { encodeScoreFile } from "@/lib/notation-format";
import { GRIDS, NEW_TAB_LIMITS, TIME_SIGNATURES, TUNINGS, newTabTex } from "@/lib/new-tab";
import { buttonPrimary, buttonSecondary, inputClass } from "../../ui";

// Trình sửa nặng (alphaTab) → chỉ tải khi bấm "Sửa tab" / "Tạo tab mới"
const TabEditor = dynamic(() => import("./TabEditor").then((m) => m.TabEditor), {
  ssr: false,
  loading: () => <p className="text-sm text-muted">Đang mở trình sửa…</p>,
});

type Mode = { kind: "idle" } | { kind: "form" } | { kind: "edit"; notation: string; isNew: boolean };

export function TabEditorLauncher({
  slug,
  title,
  notation,
  defaultBpm,
}: {
  slug: string;
  title: string;
  notation: string | null;
  defaultBpm?: number;
}) {
  const [mode, setMode] = useState<Mode>({ kind: "idle" });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string>();

  if (mode.kind === "edit") {
    return (
      <TabEditor
        slug={slug}
        notation={mode.notation}
        isNew={mode.isNew}
        defaultBpm={mode.isNew ? undefined : defaultBpm}
        onClose={() => setMode({ kind: "idle" })}
      />
    );
  }

  async function onCreate(form: FormData) {
    setError(undefined);
    setCreating(true);
    try {
      const alphaTab = await import("@coderline/alphatab");
      const tex = newTabTex({
        title,
        tuning: String(form.get("tuning")),
        capo: Number(form.get("capo")),
        bpm: Number(form.get("bpm")),
        timeSignature: String(form.get("ts")),
        bars: Number(form.get("bars")),
        grid: Number(form.get("grid")),
      });
      const settings = new alphaTab.Settings();
      const score = alphaTab.importer.ScoreLoader.loadAlphaTex(tex, settings);
      const bytes = new alphaTab.exporter.Gp7Exporter().export(score, settings);
      setMode({ kind: "edit", notation: encodeScoreFile(bytes, 0), isNew: true });
    } catch (e) {
      console.error("Tạo tab mới:", e);
      setError("Không tạo được tab mới. Thử lại nhé.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">{notation ? "Sửa tab tương tác" : "Soạn tab tương tác"}</h2>
          <p className="text-sm text-muted">
            {notation
              ? "Bấm vào nốt để đổi phím, dây, trường độ, thêm/xoá nốt, tiếng đập “xx”, luyến — hoặc soạn lại từ đầu."
              : "Chưa có file Guitar Pro? Tạo tab trống rồi bấm vào từng chỗ để điền số phím, nghe thử và lưu."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setMode(mode.kind === "form" ? { kind: "idle" } : { kind: "form" })}
            className={notation ? buttonSecondary : buttonPrimary}
            aria-expanded={mode.kind === "form"}
          >
            Tạo tab mới
          </button>
          {notation && (
            <button type="button" onClick={() => setMode({ kind: "edit", notation, isNew: false })} className={buttonPrimary}>
              Sửa tab
            </button>
          )}
        </div>
      </div>

      {mode.kind === "form" && (
        <form action={onCreate} className="flex flex-col gap-4 rounded-xl border border-line bg-bg p-4" aria-label="Tạo tab mới">
          {notation && (
            <p className="rounded-lg border border-dashed border-border px-3 py-2 text-sm text-muted">
              Bài này đã có tab. Tab mới chỉ thay tab cũ khi bạn bấm <b className="text-soft">Lưu tab</b>; bấm Đóng thì tab cũ giữ nguyên.
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Cách lên dây" htmlFor="nt-tuning">
              <select id="nt-tuning" name="tuning" defaultValue="standard" className={inputClass}>
                {TUNINGS.map((t) => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Capo (ngăn)" htmlFor="nt-capo">
              <input id="nt-capo" name="capo" type="number" min={NEW_TAB_LIMITS.capo[0]} max={NEW_TAB_LIMITS.capo[1]} defaultValue={0} className={inputClass} />
            </Field>
            <Field label="Tempo (bpm)" htmlFor="nt-bpm">
              <input id="nt-bpm" name="bpm" type="number" min={NEW_TAB_LIMITS.bpm[0]} max={NEW_TAB_LIMITS.bpm[1]} defaultValue={defaultBpm ?? 80} className={inputClass} />
            </Field>
            <Field label="Nhịp" htmlFor="nt-ts">
              <select id="nt-ts" name="ts" defaultValue="4/4" className={inputClass}>
                {TIME_SIGNATURES.map((t) => (
                  <option key={t.id} value={t.id}>{t.id}</option>
                ))}
              </select>
            </Field>
            <Field label="Số ô nhịp" htmlFor="nt-bars" hint="Thêm / bớt ô được trong lúc soạn">
              <input id="nt-bars" name="bars" type="number" min={NEW_TAB_LIMITS.bars[0]} max={NEW_TAB_LIMITS.bars[1]} defaultValue={8} className={inputClass} />
            </Field>
            <Field label="Ô trống chia theo" htmlFor="nt-grid" hint="Mỗi ô kẻ sẵn các dấu lặng để điền nốt">
              <select id="nt-grid" name="grid" defaultValue="8" className={inputClass}>
                {GRIDS.map((g) => (
                  <option key={g.value} value={g.value}>{g.label}</option>
                ))}
              </select>
            </Field>
          </div>
          {error && <p role="alert" className="text-sm font-medium text-red-400">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={creating} className={buttonPrimary}>
              {creating ? "Đang tạo…" : "Tạo và mở trình soạn"}
            </button>
            <button type="button" onClick={() => setMode({ kind: "idle" })} className={buttonSecondary}>
              Huỷ
            </button>
          </div>
        </form>
      )}
    </section>
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
