"use client";

import type { AlphaTabApi, model } from "@coderline/alphatab";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { decodeNotation, encodeScoreFile } from "@/lib/notation-format";
import { saveScore } from "../../actions";
import { buttonPrimary, buttonSecondary } from "../../ui";

type Beat = model.Beat;
type Note = model.Note;
/** Vị trí con trỏ: ô, beat trong ô, dây (đánh số kiểu tab: 1 = dây Mi cao) */
type Cursor = { bar: number; beat: number; string: number };
type Box = { x: number; y: number; w: number; h: number };

const DURATIONS = [1, 2, 4, 8, 16, 32]; // tròn → móc ba
const DURATION_NAME: Record<number, string> = { 1: "tròn", 2: "trắng", 4: "đen", 8: "móc đơn", 16: "móc kép", 32: "móc ba" };
const HISTORY_LIMIT = 60;

/**
 * Trình sửa tab trực quan: bấm vào nốt rồi sửa bằng bàn phím, nghe thử ngay, hoàn tác, lưu lên site.
 * Mỗi lần sửa: đổi mô hình bản nhạc → xuất Guitar Pro 7 → nạp lại (alphaTab tự dựng lại cấu trúc).
 */
export function TabEditor({ slug, notation, onClose }: { slug: string; notation: string; onClose: () => void }) {
  const router = useRouter();
  const hostRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<AlphaTabApi | null>(null);
  const libRef = useRef<typeof import("@coderline/alphatab") | null>(null);
  const trackRef = useRef(0);
  const historyRef = useRef<{ stack: Uint8Array[]; at: number }>({ stack: [], at: -1 });
  const digitRef = useRef<{ value: string; time: number }>({ value: "", time: 0 });
  const cursorRef = useRef<Cursor>({ bar: 0, beat: 0, string: 1 });
  const [cursor, setCursorState] = useState<Cursor>({ bar: 0, beat: 0, string: 1 });
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();
  const [warnings, setWarnings] = useState<string[]>([]);
  const [info, setInfo] = useState("");
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // ---------- Truy cập mô hình ----------
  const staff = () => apiRef.current?.score?.tracks[trackRef.current]?.staves[0] ?? null;
  const stringCount = () => staff()?.tuning.length ?? 6;
  /** Dây theo tab (1 = cao nhất) ↔ dây trong mô hình alphaTab (1 = thấp nhất) */
  const toModel = (s: number) => stringCount() - s + 1;
  const beatAt = (c: Cursor): Beat | null => staff()?.bars[c.bar]?.voices[0]?.beats[c.beat] ?? null;
  const noteAt = (c: Cursor): Note | null => beatAt(c)?.notes.find((n) => n.string === toModel(c.string)) ?? null;
  const openPitch = (tabString: number) => {
    const st = staff();
    return st ? st.tuning[tabString - 1] + st.capo : 0;
  };

  // ---------- Khung chọn + thông tin ----------
  const drawSelection = useCallback(() => {
    const api = apiRef.current, box = boxRef.current, c = cursorRef.current;
    if (!api || !box) return;
    const beat = beatAt(c);
    const lookup = api.renderer.boundsLookup;
    // Một beat có vị trí ở cả khuông nhạc lẫn khuông tab → lấy khuông tab (nằm dưới cùng)
    const all = beat && lookup ? lookup.findBeats(beat) ?? [] : [];
    const bb = all.sort((a, b) => b.visualBounds.y - a.visualBounds.y)[0];
    if (!beat || !bb) { box.style.display = "none"; return; }
    const note = noteAt(c);
    const nb = note && all.flatMap((x) => x.notes ?? []).filter((n) => n.note === note).sort((a, b) => b.noteHeadBounds.y - a.noteHeadBounds.y)[0];
    let r: Box;
    if (nb) {
      const h = nb.noteHeadBounds;
      r = { x: h.x - 3, y: h.y - 3, w: h.w + 6, h: h.h + 6 };
    } else {
      // dây trống: ước lượng vị trí dây từ các nốt cùng beat / cả cột beat
      const v = bb.visualBounds;
      r = { x: v.x - 2, y: v.y, w: Math.max(v.w, 14) + 4, h: v.h };
    }
    // toạ độ alphaTab tính theo vùng vẽ (host); khung chọn nằm cạnh host nên cộng thêm vị trí của host
    const host = hostRef.current;
    const ox = host?.offsetLeft ?? 0, oy = host?.offsetTop ?? 0;
    Object.assign(box.style, { display: "block", left: `${ox + r.x}px`, top: `${oy + r.y}px`, width: `${r.w}px`, height: `${r.h}px` });
    const dur = `${DURATION_NAME[beat.duration] ?? beat.duration}${beat.dots ? " chấm" : ""}`;
    const what = note
      ? note.isDead ? "X (đập/chặn dây)" : `phím ${note.fret}${note.slideOutType ? " · luyến" : ""}${note.isLetRing ? " · ngân" : ""}`
      : beat.isRest ? "dấu lặng" : "trống";
    setInfo(`Ô ${c.bar + 1} · beat ${c.beat + 1} · dây ${c.string} · ${what} · ${dur}`);
  }, []);

  const setCursor = useCallback((c: Cursor) => {
    cursorRef.current = c;
    setCursorState(c);
    drawSelection();
  }, [drawSelection]);

  const checkBars = useCallback(() => {
    const st = staff();
    if (!st) return;
    const out: string[] = [];
    st.bars.forEach((bar, i) => {
      const mb = bar.masterBar;
      const want = (mb.timeSignatureNumerator * 3840) / mb.timeSignatureDenominator;
      const have = bar.voices[0].beats.reduce((s, b) => s + b.playbackDuration, 0);
      if (have !== want) {
        const diff = (have - want) / 240; // đơn vị móc kép
        out.push(`Ô ${i + 1}: ${diff > 0 ? "thừa" : "thiếu"} ${Math.abs(diff)} móc kép`);
      }
    });
    setWarnings(out);
  }, []);

  // ---------- Nạp alphaTab ----------
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let api: AlphaTabApi | null = null;
    let cancelled = false;
    (async () => {
      const alphaTab = await import("@coderline/alphatab");
      if (cancelled) return;
      libRef.current = alphaTab;
      const css = getComputedStyle(document.documentElement);
      const color = (n: string) => css.getPropertyValue(n).trim();
      api = new alphaTab.AlphaTabApi(host, {
        // includeNoteBounds: tính vị trí từng nốt → bấm chọn được nốt và vẽ khung chọn đúng nốt
        core: { fontDirectory: "/alphatab/font/", scriptFile: "/alphatab/alphaTab.mjs", includeNoteBounds: true },
        display: {
          layoutMode: alphaTab.LayoutMode.Page,
          scale: 1,
          resources: {
            mainGlyphColor: color("--text"),
            secondaryGlyphColor: color("--muted"),
            scoreInfoColor: color("--text"),
            staffLineColor: "#4a4a4a",
            barSeparatorColor: "#5a5a5a",
            barNumberColor: color("--accent-ink"),
          },
        },
        player: {
          playerMode: alphaTab.PlayerMode.EnabledSynthesizer,
          soundFont: "/alphatab/soundfont/sonivox.sf2",
          enablePlaybackRangeSelection: false,
          scrollMode: alphaTab.ScrollMode.Off,
        },
      });
      apiRef.current = api;
      api.renderFinished.on(() => {
        setReady(true);
        checkBars();
      });
      // Bảng vị trí nốt (boundsLookup) chỉ đầy đủ sau postRenderFinished → vẽ khung chọn lúc này
      api.postRenderFinished.on(() => drawSelection());
      api.playerStateChanged.on((e) => setPlaying(e.state === alphaTab.synth.PlayerState.Playing));
      api.noteMouseDown.on((note) => {
        clickedNoteRef.current = true;
        const beat = note.beat;
        setCursor({ bar: beat.voice.bar.index, beat: beat.index, string: stringCount() - note.string + 1 });
        host.focus();
      });
      api.beatMouseDown.on((beat) => {
        if (clickedNoteRef.current) { clickedNoteRef.current = false; return; }
        setCursor({ bar: beat.voice.bar.index, beat: beat.index, string: cursorRef.current.string });
        host.focus();
      });
      api.error.on((e) => { console.error("alphaTab:", e); setError("Không nạp được tab để sửa."); });
      const data = decodeNotation(notation);
      if (data.kind === "file") {
        trackRef.current = data.track;
        api.load(data.bytes, [data.track]);
      } else {
        trackRef.current = 0;
        api.tex(data.tex);
      }
      // bản gốc làm mốc hoàn tác đầu tiên
      api.scoreLoaded.on(function first(score) {
        if (historyRef.current.stack.length) return;
        historyRef.current = { stack: [new alphaTab.exporter.Gp7Exporter().export(score, null)], at: 0 };
      });
    })().catch((e) => { console.error("alphaTab:", e); setError("Không nạp được tab để sửa."); });
    return () => { cancelled = true; api?.destroy(); apiRef.current = null; };
  }, [notation, checkBars, drawSelection, setCursor]);
  const clickedNoteRef = useRef(false);

  // ---------- Áp dụng một thay đổi ----------
  const commit = useCallback((mutate: () => boolean | void) => {
    const api = apiRef.current, lib = libRef.current;
    if (!api?.score || !lib) return;
    if (mutate() === false) return;
    const bytes = new lib.exporter.Gp7Exporter().export(api.score, null);
    const h = historyRef.current;
    h.stack = [...h.stack.slice(0, h.at + 1), bytes].slice(-HISTORY_LIMIT);
    h.at = h.stack.length - 1;
    setCanUndo(h.at > 0);
    setCanRedo(false);
    setDirty(true);
    api.load(bytes, [trackRef.current]);
  }, []);

  const travel = useCallback((dir: -1 | 1) => {
    const api = apiRef.current, h = historyRef.current;
    const at = h.at + dir;
    if (!api || at < 0 || at >= h.stack.length) return;
    h.at = at;
    setCanUndo(at > 0);
    setCanRedo(at < h.stack.length - 1);
    setDirty(true);
    api.load(h.stack[at], [trackRef.current]);
  }, []);

  // ---------- Bàn phím ----------
  const onKeyDown = (e: React.KeyboardEvent) => {
    const lib = libRef.current, st = staff();
    if (!lib || !st) return;
    const c = cursorRef.current;
    const key = e.key;
    const mod = e.metaKey || e.ctrlKey;
    const beat = beatAt(c), note = noteAt(c);
    const handled = () => { e.preventDefault(); e.stopPropagation(); };

    if (mod && key.toLowerCase() === "z") { handled(); travel(e.shiftKey ? 1 : -1); return; }
    if (mod && key.toLowerCase() === "y") { handled(); travel(1); return; }
    if (key === " ") { handled(); apiRef.current?.playPause(); return; }

    // Di chuyển
    if (key === "ArrowLeft" || key === "ArrowRight") {
      handled();
      const d = key === "ArrowLeft" ? -1 : 1;
      let { bar, beat: bi } = c;
      bi += d;
      if (bi < 0) { bar -= 1; if (bar < 0) return; bi = st.bars[bar].voices[0].beats.length - 1; }
      else if (bi >= st.bars[bar].voices[0].beats.length) { bar += 1; if (bar >= st.bars.length) return; bi = 0; }
      setCursor({ bar, beat: bi, string: c.string });
      return;
    }
    if ((key === "ArrowUp" || key === "ArrowDown") && !e.shiftKey) {
      handled();
      const s = Math.min(stringCount(), Math.max(1, c.string + (key === "ArrowUp" ? -1 : 1)));
      setCursor({ ...c, string: s });
      return;
    }
    if (!beat) return;

    // Chuyển nốt sang dây bên cạnh, giữ nguyên cao độ
    if ((key === "ArrowUp" || key === "ArrowDown") && e.shiftKey) {
      handled();
      if (!note || note.isDead) return;
      const s = c.string + (key === "ArrowUp" ? -1 : 1);
      if (s < 1 || s > stringCount()) return;
      const fret = note.fret + openPitch(c.string) - openPitch(s);
      if (fret < 0 || fret > 24 || beat.notes.some((n) => n.string === toModel(s))) {
        setMessage(`Không chuyển được: dây ${s} ${fret < 0 ? "không xuống thấp vậy được" : "đã có nốt hoặc phím quá cao"}.`);
        return;
      }
      commit(() => { note.string = toModel(s); note.fret = fret; });
      setCursor({ ...c, string: s });
      return;
    }

    // Gõ số → đặt phím (gõ 2 chữ số liền nhau trong 0,7 s để ra 10–24)
    if (/^[0-9]$/.test(key)) {
      handled();
      const now = Date.now();
      const d = digitRef.current;
      const value = now - d.time < 700 && d.value.length === 1 ? d.value + key : key;
      digitRef.current = { value, time: now };
      const fret = Number(value);
      if (fret > 24) return;
      commit(() => {
        const n = noteAt(c);
        if (n) { n.fret = fret; n.isDead = false; return; }
        const created = new lib.model.Note();
        created.string = toModel(c.string);
        created.fret = fret;
        created.isLetRing = beat.notes.some((x) => x.isLetRing);
        beat.isEmpty = false;
        beat.addNote(created);
      });
      return;
    }

    switch (key) {
      case "Delete":
      case "Backspace":
        handled();
        if (e.shiftKey) {
          // xoá cả beat (giữ ít nhất một beat trong ô)
          const beats = st.bars[c.bar].voices[0].beats;
          if (beats.length <= 1) return;
          commit(() => { beats.splice(c.beat, 1); });
          setCursor({ ...c, beat: Math.max(0, c.beat - 1) });
          return;
        }
        if (!note) return;
        commit(() => { beat.removeNote(note); });
        return;
      case "Insert":
      case "i":
      case "I": {
        handled();
        // chèn một dấu lặng cùng trường độ ngay sau beat đang chọn
        commit(() => {
          const nb = new lib.model.Beat();
          nb.duration = beat.duration;
          nb.isEmpty = false;
          st.bars[c.bar].voices[0].beats.splice(c.beat + 1, 0, nb);
        });
        setCursor({ ...c, beat: c.beat + 1 });
        return;
      }
      case "+":
      case "=":
      case "-":
      case "_": {
        handled();
        const longer = key === "+" || key === "=";
        const i = DURATIONS.indexOf(beat.duration);
        const j = i + (longer ? -1 : 1);
        if (i < 0 || j < 0 || j >= DURATIONS.length) return;
        commit(() => { beat.duration = DURATIONS[j]; });
        return;
      }
      case ".":
        handled();
        commit(() => { beat.dots = beat.dots ? 0 : 1; });
        return;
      case "x":
      case "X": {
        handled();
        // bật/tắt tiếng đập “xx”: X trên 2 dây bass còn trống
        const dead = beat.notes.filter((n) => n.isDead);
        commit(() => {
          if (dead.length) { for (const n of dead) beat.removeNote(n); return; }
          const used = new Set(beat.notes.map((n) => n.string));
          for (const s of [1, 2, 3].filter((m) => !used.has(m)).slice(0, 2)) {
            const n = new lib.model.Note();
            n.string = s;
            n.fret = 0;
            n.isDead = true;
            beat.isEmpty = false;
            beat.addNote(n);
          }
        });
        return;
      }
      case "s":
      case "S":
        handled();
        if (!note) return;
        commit(() => { note.slideOutType = note.slideOutType ? lib.model.SlideOutType.None : lib.model.SlideOutType.Legato; });
        return;
      case "l":
      case "L":
        handled();
        if (!note) return;
        commit(() => { note.isLetRing = !note.isLetRing; });
        return;
    }
  };

  async function onSave() {
    const api = apiRef.current, lib = libRef.current;
    if (!api?.score || !lib) return;
    setSaving(true);
    setError(undefined);
    const bytes = new lib.exporter.Gp7Exporter().export(api.score, null);
    const result = await saveScore(slug, encodeScoreFile(bytes, trackRef.current));
    setSaving(false);
    if (!result.ok) return setError(result.error);
    setDirty(false);
    setMessage("✓ Đã lưu tab. Trang bài trên site đã cập nhật.");
    router.refresh();
  }

  function onCancel() {
    if (dirty && !confirm("Bỏ các thay đổi chưa lưu?")) return;
    onClose();
  }

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-accent/40 bg-surface p-4" aria-label="Sửa tab">
      <div className="sticky top-16 z-10 -mx-1 flex flex-wrap items-center gap-2 rounded-xl border border-line bg-surface/95 p-2 backdrop-blur-md">
        <button type="button" onClick={() => apiRef.current?.playPause()} disabled={!ready} className={buttonSecondary}>
          {playing ? "Tạm dừng" : "Nghe thử"}
        </button>
        <button type="button" onClick={() => travel(-1)} disabled={!canUndo} className={buttonSecondary} title="Ctrl/⌘ + Z">
          Hoàn tác
        </button>
        <button type="button" onClick={() => travel(1)} disabled={!canRedo} className={buttonSecondary} title="Ctrl/⌘ + Shift + Z">
          Làm lại
        </button>
        <span className="min-w-0 flex-1 truncate px-1 font-mono text-xs text-soft" aria-live="polite">{info}</span>
        <button type="button" onClick={onCancel} className={buttonSecondary}>
          Đóng
        </button>
        <button type="button" onClick={onSave} disabled={!dirty || saving} className={buttonPrimary}>
          {saving ? "Đang lưu…" : dirty ? "Lưu tab" : "Đã lưu"}
        </button>
      </div>

      {error && <p role="alert" className="rounded-xl border border-red-500/50 bg-red-500/10 px-4 py-2 text-sm text-red-300">{error}</p>}
      {message && !error && <p role="status" className="rounded-xl border border-accent/40 bg-fresh px-4 py-2 text-sm text-accent-ink">{message}</p>}
      {warnings.length > 0 && (
        <p className="rounded-xl border border-dashed border-border px-4 py-2 text-xs text-muted">
          ⚠ Ô chưa đủ / thừa phách (đổi trường độ để cân lại): {warnings.join(" · ")}
        </p>
      )}

      <details className="rounded-xl border border-line px-4 py-2 text-sm text-muted" open>
        <summary className="cursor-pointer font-semibold text-soft">Phím tắt</summary>
        <ul className="mt-2 grid gap-x-6 gap-y-1 sm:grid-cols-2">
          <li><b className="text-soft">Bấm vào nốt / beat</b>: chọn</li>
          <li><b className="text-soft">← →</b>: beat trước / sau · <b className="text-soft">↑ ↓</b>: đổi dây đang chọn</li>
          <li><b className="text-soft">0–9</b>: đặt phím (gõ liền 2 số cho 10–24); dây trống thì thêm nốt</li>
          <li><b className="text-soft">Shift + ↑ ↓</b>: chuyển nốt sang dây bên cạnh, giữ cao độ</li>
          <li><b className="text-soft">Delete</b>: xoá nốt · <b className="text-soft">Shift + Delete</b>: xoá cả beat</li>
          <li><b className="text-soft">I</b>: chèn dấu lặng sau beat đang chọn</li>
          <li><b className="text-soft">+ / −</b>: dài hơn / ngắn hơn · <b className="text-soft">.</b>: chấm dôi</li>
          <li><b className="text-soft">X</b>: bật/tắt tiếng đập “xx” · <b className="text-soft">S</b>: luyến · <b className="text-soft">L</b>: ngân</li>
          <li><b className="text-soft">Space</b>: nghe thử · <b className="text-soft">Ctrl/⌘ + Z</b>: hoàn tác</li>
        </ul>
      </details>

      <div className="tab-player tab-editor relative overflow-x-auto rounded-xl border border-line bg-bg p-2 sm:p-4">
        <div
          ref={hostRef}
          tabIndex={0}
          onKeyDown={onKeyDown}
          className="relative outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
          aria-label="Vùng sửa tab — bấm vào nốt rồi dùng bàn phím"
        />
        <div ref={boxRef} aria-hidden className="pointer-events-none absolute hidden rounded-md border-2 border-accent bg-accent/15" style={{ zIndex: 5 }} />
      </div>
      {!ready && !error && <p className="text-sm text-muted">Đang nạp tab…</p>}
    </section>
  );
}
