"use client";

import type { AlphaTabApi, model } from "@coderline/alphatab";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { decodeNotation, encodeScoreFile } from "@/lib/notation-format";
import { saveScore } from "@/lib/song-content-actions";
import { buttonPrimary, buttonSecondary } from "@/app/admin/ui";

type Beat = model.Beat;
type Note = model.Note;
/** Vị trí con trỏ: ô, beat trong ô, dây (đánh số kiểu tab: 1 = dây Mi cao) */
type Cursor = { bar: number; beat: number; string: number };
type Box = { x: number; y: number; w: number; h: number };

const DURATIONS = [1, 2, 4, 8, 16, 32]; // tròn → móc ba
const DURATION_NAME: Record<number, string> = { 1: "tròn", 2: "trắng", 4: "đen", 8: "móc đơn", 16: "móc kép", 32: "móc ba" };
const DURATION_SHORT: Record<number, string> = { 1: "Tròn", 2: "Trắng", 4: "Đen", 8: "Đơn", 16: "Kép", 32: "Ba" };
const HISTORY_LIMIT = 60;
const BPM_STEP = 4, BPM_MIN = 30, BPM_MAX = 240;

/**
 * Trình sửa tab trực quan: bấm vào nốt rồi sửa bằng bàn phím, nghe thử ngay, hoàn tác, lưu lên site.
 * Mỗi lần sửa: đổi mô hình bản nhạc → xuất Guitar Pro 7 → nạp lại (alphaTab tự dựng lại cấu trúc).
 */
export function TabEditor({
  slug,
  notation,
  defaultBpm,
  isNew = false,
  onClose,
}: {
  slug: string;
  notation: string;
  defaultBpm?: number;
  /** Tab trống vừa tạo (chưa lưu) */
  isNew?: boolean;
  onClose: () => void;
}) {
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
  const [dirty, setDirty] = useState(isNew);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | undefined>(
    isNew ? "Tab trống đã sẵn sàng: bấm vào một dấu lặng, chọn dây (bấm vào dây hoặc ↑ ↓) rồi gõ số phím. Xong bấm “Lưu tab”." : undefined,
  );
  const [error, setError] = useState<string>();
  /** Ô lệch phách: diff > 0 là thừa, < 0 là thiếu (đơn vị tick, 960 = 1 phách đen) */
  const [warnings, setWarnings] = useState<{ bar: number; diff: number }[]>([]);
  const [info, setInfo] = useState("");
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  /** Tempo nghe thử: chỉ đổi tốc độ phát, không đổi bài. Giữ nguyên qua các lần sửa (mỗi lần sửa alphaTab nạp lại bài). */
  const [bpm, setBpm] = useState<number | null>(null);
  const [startBpm, setStartBpm] = useState<number | null>(null);
  const bpmRef = useRef<{ base: number; current: number | null }>({ base: 120, current: null });
  /** Trường độ / trạng thái của beat đang chọn — để tô sáng nút trên thanh công cụ */
  const [sel, setSel] = useState<{ duration: number; dots: number; note: boolean } | null>(null);
  /** Vị trí con trỏ chuột lúc bấm (toạ độ trong vùng vẽ) — để biết đã bấm vào dây nào */
  const pointRef = useRef<{ x: number; y: number } | null>(null);

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
    setSel(beat ? { duration: beat.duration, dots: beat.dots, note: !!noteAt(c) } : null);
    if (!beat || !bb) { box.style.display = "none"; return; }
    const note = noteAt(c);
    const nb = note && all.flatMap((x) => x.notes ?? []).filter((n) => n.note === note).sort((a, b) => b.noteHeadBounds.y - a.noteHeadBounds.y)[0];
    let r: Box;
    if (nb) {
      const h = nb.noteHeadBounds;
      r = { x: h.x - 3, y: h.y - 3, w: h.w + 6, h: h.h + 6 };
    } else {
      // dây trống: các dây tab trải đều từ mép trên tới mép dưới của ô (khuông tab)
      const v = bb.visualBounds, line = bb.barBounds.visualBounds;
      const gap = line.h / Math.max(1, stringCount() - 1);
      r = { x: v.x - 2, y: line.y + (c.string - 1) * gap - gap / 2, w: Math.max(v.w, 14) + 4, h: gap };
    }
    // toạ độ alphaTab tính theo vùng vẽ (host); khung chọn nằm cạnh host nên cộng thêm vị trí của host
    const host = hostRef.current;
    const ox = host?.offsetLeft ?? 0, oy = host?.offsetTop ?? 0;
    Object.assign(box.style, { display: "block", left: `${ox + r.x}px`, top: `${oy + r.y}px`, width: `${r.w}px`, height: `${r.h}px` });
    const dur = `${DURATION_NAME[beat.duration] ?? beat.duration}${beat.dots ? " chấm" : ""}`;
    const what = note
      ? note.isDead ? "X (đập/chặn dây)" : `phím ${note.fret}${note.slideOutType ? " · luyến" : ""}${note.isLetRing ? " · ngân" : ""}`
      : `${beat.isRest ? "dấu lặng" : "dây trống"} → gõ số để thêm nốt`;
    const mb = beat.voice.bar.masterBar;
    const gap = beat.voice.beats.reduce((s, b) => s + b.playbackDuration, 0) - (mb.timeSignatureNumerator * 3840) / mb.timeSignatureDenominator;
    // trạng thái phách để ngay đầu (dòng này bị cắt bớt khi màn hình hẹp)
    const barState = gap === 0 ? "" : ` (⚠ ${gap < 0 ? "thiếu" : "thừa"} ${formatBeats(Math.abs(gap))})`;
    setInfo(`Ô ${c.bar + 1}${barState} · beat ${c.beat + 1} · dây ${c.string} · ${what} · ${dur}`);
  }, []);

  const setCursor = useCallback((c: Cursor) => {
    cursorRef.current = c;
    setCursorState(c);
    drawSelection();
  }, [drawSelection]);

  const checkBars = useCallback(() => {
    const st = staff();
    if (!st) return;
    const out: { bar: number; diff: number }[] = [];
    st.bars.forEach((bar, i) => {
      const mb = bar.masterBar;
      const want = (mb.timeSignatureNumerator * 3840) / mb.timeSignatureDenominator;
      const have = bar.voices[0].beats.reduce((s, b) => s + b.playbackDuration, 0);
      if (have !== want) out.push({ bar: i, diff: have - want });
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
      // alphaTab báo beatMouseDown trước, rồi noteMouseDown nếu trúng nốt → nốt ghi đè lựa chọn theo beat
      api.noteMouseDown.on((note) => {
        const beat = note.beat;
        setCursor({ bar: beat.voice.bar.index, beat: beat.index, string: stringCount() - note.string + 1 });
        host.focus();
      });
      api.beatMouseDown.on((beat) => {
        // bấm vào chỗ trống trên khuông tab → chọn đúng dây đó (để thêm nốt đôi / hợp âm)
        let string = cursorRef.current.string;
        const p = pointRef.current;
        const tab = (api?.renderer.boundsLookup?.findBeats(beat) ?? []).sort((a, b) => b.visualBounds.y - a.visualBounds.y)[0];
        if (p && tab) {
          const line = tab.barBounds.visualBounds, n = stringCount();
          const i = Math.round((p.y - line.y) / (line.h / Math.max(1, n - 1)));
          if (i >= 0 && i < n) string = i + 1;
        }
        setCursor({ bar: beat.voice.bar.index, beat: beat.index, string });
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
      // tempo nghe thử: áp lại sau mỗi lần nạp (mỗi lần sửa là một lần nạp lại)
      api.scoreLoaded.on((score) => {
        const t = bpmRef.current;
        t.base = score.tempo || 120;
        if (t.current === null) {
          t.current = defaultBpm ?? t.base;
          setStartBpm(t.current);
          setBpm(t.current);
        }
        if (api) api.playbackSpeed = t.current / t.base;
      });
      // bản gốc làm mốc hoàn tác đầu tiên
      api.scoreLoaded.on(function first(score) {
        if (historyRef.current.stack.length) return;
        historyRef.current = { stack: [new alphaTab.exporter.Gp7Exporter().export(score, null)], at: 0 };
      });
    })().catch((e) => { console.error("alphaTab:", e); setError("Không nạp được tab để sửa."); });
    return () => { cancelled = true; api?.destroy(); apiRef.current = null; };
  }, [notation, defaultBpm, checkBars, drawSelection, setCursor]);

  const changeBpm = (next: number) => {
    const v = Math.min(BPM_MAX, Math.max(BPM_MIN, next));
    bpmRef.current.current = v;
    setBpm(v);
    if (apiRef.current) apiRef.current.playbackSpeed = v / bpmRef.current.base;
  };

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

  // ---------- Các thao tác sửa (dùng chung cho phím tắt và nút bấm) ----------
  const focusHost = () => hostRef.current?.focus({ preventScroll: true });
  const context = () => {
    const lib = libRef.current, st = staff();
    if (!lib || !st) return null;
    const c = cursorRef.current;
    return { lib, st, c, voice: st.bars[c.bar]?.voices[0], beat: beatAt(c), note: noteAt(c) };
  };

  /** Đặt phím cho nốt đang chọn; dây đang trống thì thêm nốt mới vào beat (thành nốt đôi / hợp âm) */
  const setFret = (fret: number) => {
    const x = context();
    if (!x?.beat || fret < 0 || fret > 24) return;
    const { lib, c, beat } = x;
    commit(() => {
      const n = noteAt(c);
      if (n) { n.fret = fret; n.isDead = false; return; }
      const created = new lib.model.Note();
      created.string = toModel(c.string);
      created.fret = fret;
      created.isLetRing = beat.notes.some((m) => m.isLetRing);
      beat.isEmpty = false;
      beat.addNote(created);
    });
  };

  /** Chèn một beat trống (dấu lặng) cùng trường độ trước / sau beat đang chọn, rồi chọn beat mới */
  const insertBeat = (after: boolean) => {
    const x = context();
    if (!x?.beat || !x.voice) return;
    const { lib, c, beat, voice } = x;
    const at = c.beat + (after ? 1 : 0);
    commit(() => {
      const nb = new lib.model.Beat();
      nb.duration = beat.duration;
      nb.dots = beat.dots;
      nb.isEmpty = false;
      nb.voice = voice;
      voice.beats.splice(at, 0, nb);
    });
    setCursor({ ...c, beat: at });
    setMessage("Đã chèn beat trống. Chọn dây (bấm vào dây hoặc ↑ ↓) rồi gõ số phím để đặt nốt.");
  };

  /** Chia beat đang chọn thành 2 beat ngắn bằng nửa — tổng phách giữ nguyên, beat sau để trống để chèn nốt */
  const splitBeat = () => {
    const x = context();
    if (!x?.beat || !x.voice) return;
    const { lib, c, beat, voice } = x;
    const i = DURATIONS.indexOf(beat.duration);
    if (i < 0 || i >= DURATIONS.length - 1) { setMessage("Nốt này đã ngắn nhất (móc ba), không chia được nữa."); return; }
    commit(() => {
      beat.duration = DURATIONS[i + 1];
      const nb = new lib.model.Beat();
      nb.duration = beat.duration;
      nb.dots = beat.dots;
      nb.isEmpty = false;
      nb.voice = voice;
      voice.beats.splice(c.beat + 1, 0, nb);
    });
    setCursor({ ...c, beat: c.beat + 1 });
    setMessage(`Đã chia đôi thành 2 ${DURATION_NAME[DURATIONS[i + 1]]}. Beat sau đang trống: chọn dây rồi gõ số phím để chèn nốt.`);
  };

  const setDuration = (d: number) => {
    const beat = context()?.beat;
    if (!beat || beat.duration === d) return;
    commit(() => { beat.duration = d; });
  };

  const changeDuration = (longer: boolean) => {
    const beat = context()?.beat;
    if (!beat) return;
    const j = DURATIONS.indexOf(beat.duration) + (longer ? -1 : 1);
    if (j >= 0 && j < DURATIONS.length) setDuration(DURATIONS[j]);
  };

  const toggleDot = () => {
    const beat = context()?.beat;
    if (beat) commit(() => { beat.dots = beat.dots ? 0 : 1; });
  };

  const deleteNote = () => {
    const x = context();
    if (x?.beat && x.note) { const { beat, note } = x; commit(() => { beat.removeNote(note); }); }
  };

  /** Xoá cả beat (giữ ít nhất một beat trong ô) */
  const deleteBeat = () => {
    const x = context();
    if (!x?.voice || x.voice.beats.length <= 1) return;
    const { c, voice } = x;
    commit(() => { voice.beats.splice(c.beat, 1); });
    setCursor({ ...c, beat: Math.max(0, c.beat - 1) });
  };

  /** Đánh lại chỉ số / liên kết ô sau khi thêm hoặc xoá ô (để xuất file đúng thứ tự) */
  const relinkBars = (score: model.Score) => {
    score.masterBars.forEach((m, i) => {
      m.index = i;
      m.score = score;
      m.previousMasterBar = score.masterBars[i - 1] ?? null;
      m.nextMasterBar = score.masterBars[i + 1] ?? null;
    });
    for (const tr of score.tracks)
      for (const s of tr.staves)
        s.bars.forEach((b, i) => {
          b.index = i;
          b.previousBar = s.bars[i - 1] ?? null;
          b.nextBar = s.bars[i + 1] ?? null;
        });
  };

  /**
   * Ô chưa đủ phách → thêm một dấu lặng vào cuối ô (cùng trường độ với nốt cuối nếu vừa, không thì lấp vừa đủ)
   * rồi chọn nó để gõ tiếp. Trả về false nếu ô đã đủ phách.
   */
  const appendBeat = (barIndex: number) => {
    const lib = libRef.current, voice = staff()?.bars[barIndex]?.voices[0];
    if (!lib || !voice) return false;
    const mb = voice.bar.masterBar;
    const missing = (mb.timeSignatureNumerator * 3840) / mb.timeSignatureDenominator - voice.beats.reduce((s, b) => s + b.playbackDuration, 0);
    if (missing <= 0) return false;
    const last = voice.beats[voice.beats.length - 1];
    const duration = last && 3840 / last.duration <= missing ? last.duration : DURATIONS.find((d) => 3840 / d <= missing);
    if (!duration) return false;
    commit(() => {
      const nb = new lib.model.Beat();
      nb.duration = duration;
      nb.isEmpty = false;
      nb.voice = voice;
      voice.beats.push(nb);
    });
    setCursor({ bar: barIndex, beat: voice.beats.length - 1, string: cursorRef.current.string });
    return true;
  };

  /** Thêm một ô trống (cùng nhịp, kẻ sẵn dấu lặng móc đơn) ngay sau ô đang chọn */
  const insertBar = () => {
    const x = context(), score = apiRef.current?.score;
    if (!x || !score) return;
    const { lib, c } = x;
    const at = c.bar + 1;
    const ref = score.masterBars[c.bar];
    commit(() => {
      const mb = new lib.model.MasterBar();
      mb.timeSignatureNumerator = ref.timeSignatureNumerator;
      mb.timeSignatureDenominator = ref.timeSignatureDenominator;
      score.masterBars.splice(at, 0, mb);
      const grid = Math.max(8, ref.timeSignatureDenominator);
      const count = Math.max(1, Math.round((ref.timeSignatureNumerator * grid) / ref.timeSignatureDenominator));
      for (const tr of score.tracks)
        for (const s of tr.staves) {
          const bar = new lib.model.Bar();
          bar.staff = s;
          const v = new lib.model.Voice();
          bar.addVoice(v);
          for (let i = 0; i < count; i++) {
            const b = new lib.model.Beat();
            b.duration = grid;
            v.addBeat(b);
          }
          s.bars.splice(at, 0, bar);
        }
      relinkBars(score);
    });
    setCursor({ bar: at, beat: 0, string: c.string });
    setMessage(`Đã thêm ô ${at + 1}.`);
  };

  /** Xoá ô đang chọn (giữ ít nhất một ô) */
  const deleteBar = () => {
    const x = context(), score = apiRef.current?.score;
    if (!x || !score || score.masterBars.length <= 1) return;
    const { c } = x;
    if (x.st.bars[c.bar].voices[0].beats.some((b) => b.notes.length) && !confirm(`Xoá ô ${c.bar + 1} cùng các nốt trong ô?`)) return;
    commit(() => {
      score.masterBars.splice(c.bar, 1);
      for (const tr of score.tracks) for (const s of tr.staves) s.bars.splice(c.bar, 1);
      relinkBars(score);
    });
    setCursor({ bar: Math.min(c.bar, score.masterBars.length - 1), beat: 0, string: c.string });
  };

  /** Bù phần thiếu của một ô bằng dấu lặng — ở đầu ô (nốt dồn về cuối, nối liền ô sau) hoặc ở cuối ô */
  const fillBar = (barIndex: number, atStart: boolean) => {
    const lib = libRef.current, st = staff();
    const voice = st?.bars[barIndex]?.voices[0];
    if (!lib || !st || !voice) return;
    const mb = st.bars[barIndex].masterBar;
    let missing = (mb.timeSignatureNumerator * 3840) / mb.timeSignatureDenominator - voice.beats.reduce((s, b) => s + b.playbackDuration, 0);
    if (missing <= 0) return;
    const rests: model.Beat[] = [];
    for (const d of DURATIONS) {
      const ticks = 3840 / d;
      while (missing >= ticks) {
        const r = new lib.model.Beat();
        r.duration = d;
        r.isEmpty = false;
        r.voice = voice;
        rests.push(r);
        missing -= ticks;
      }
    }
    if (!rests.length) return;
    commit(() => {
      if (atStart) voice.beats.splice(0, 0, ...rests);
      else voice.beats.push(...rests);
    });
    const c = cursorRef.current;
    if (atStart && c.bar === barIndex) setCursor({ ...c, beat: c.beat + rests.length });
    setMessage(`Đã bù ô ${barIndex + 1} bằng ${rests.length} dấu lặng ở ${atStart ? "đầu" : "cuối"} ô.`);
  };

  /** Bật/tắt tiếng đập “xx”: X trên 2 dây bass còn trống */
  const toggleDead = () => {
    const x = context();
    if (!x?.beat) return;
    const { lib, beat } = x;
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
  };

  const toggleSlide = () => {
    const x = context();
    if (!x?.note) return;
    const { lib, note } = x;
    commit(() => { note.slideOutType = note.slideOutType ? lib.model.SlideOutType.None : lib.model.SlideOutType.Legato; });
  };

  const toggleLetRing = () => {
    const note = context()?.note;
    if (note) commit(() => { note.isLetRing = !note.isLetRing; });
  };

  /** Bấm nút trên thanh công cụ: làm thao tác rồi trả bàn phím về vùng tab để gõ tiếp */
  const run = (fn: () => void) => { fn(); focusHost(); };

  // ---------- Bàn phím ----------
  const onKeyDown = (e: React.KeyboardEvent) => {
    const st = staff();
    if (!libRef.current || !st) return;
    const c = cursorRef.current;
    const key = e.key;
    const mod = e.metaKey || e.ctrlKey;
    const beat = beatAt(c), note = noteAt(c);
    const handled = () => { e.preventDefault(); e.stopPropagation(); };

    if (mod && key.toLowerCase() === "z") { handled(); travel(e.shiftKey ? 1 : -1); return; }
    if (mod && key.toLowerCase() === "y") { handled(); travel(1); return; }
    if (mod) return;
    if (key === " ") { handled(); apiRef.current?.playPause(); return; }

    // Di chuyển
    if (key === "ArrowLeft" || key === "ArrowRight") {
      handled();
      const d = key === "ArrowLeft" ? -1 : 1;
      let { bar, beat: bi } = c;
      bi += d;
      if (bi < 0) { bar -= 1; if (bar < 0) return; bi = st.bars[bar].voices[0].beats.length - 1; }
      else if (bi >= st.bars[bar].voices[0].beats.length) {
        // Như Guitar Pro: ô chưa đủ phách → thêm chỗ trống mới trong cùng ô; ô cuối đã đủ → thêm ô mới
        if (appendBeat(bar)) return;
        if (bar === st.bars.length - 1) { insertBar(); return; }
        bar += 1;
        bi = 0;
      }
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
      const now = e.timeStamp; // mốc thời gian của sự kiện phím (ms)
      const d = digitRef.current;
      const value = now - d.time < 700 && d.value.length === 1 ? d.value + key : key;
      digitRef.current = { value, time: now };
      setFret(Number(value));
      return;
    }

    const actions: Record<string, () => void> = {
      Delete: e.shiftKey ? deleteBeat : deleteNote,
      Backspace: e.shiftKey ? deleteBeat : deleteNote,
      Insert: () => insertBeat(!e.shiftKey),
      i: () => insertBeat(true),
      I: () => insertBeat(!e.shiftKey),
      d: splitBeat,
      D: splitBeat,
      "+": () => changeDuration(true),
      "=": () => changeDuration(true),
      "-": () => changeDuration(false),
      _: () => changeDuration(false),
      ".": toggleDot,
      x: toggleDead,
      X: toggleDead,
      s: toggleSlide,
      S: toggleSlide,
      l: toggleLetRing,
      L: toggleLetRing,
    };
    const action = actions[key];
    if (action) { handled(); action(); }
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
        <div role="group" aria-label="Tempo nghe thử" className="flex h-10 items-stretch overflow-hidden rounded-lg border border-border">
          <button
            type="button"
            onClick={() => bpm && changeBpm(bpm - BPM_STEP)}
            disabled={!bpm || bpm <= BPM_MIN}
            aria-label="Giảm tempo"
            className="w-9 text-lg leading-none text-soft transition-colors hover:bg-surface-2 hover:text-text disabled:opacity-40"
          >
            −
          </button>
          <button
            type="button"
            onClick={() => startBpm && changeBpm(startBpm)}
            disabled={!bpm}
            title={startBpm ? `Tempo nghe thử — bấm để về ${startBpm} bpm` : undefined}
            className={`min-w-[76px] border-x border-border px-2 font-mono text-xs tabular-nums transition-colors hover:bg-surface-2 ${
              bpm && startBpm && bpm !== startBpm ? "text-accent-ink" : "text-soft"
            }`}
          >
            {bpm ?? "—"} bpm
          </button>
          <button
            type="button"
            onClick={() => bpm && changeBpm(bpm + BPM_STEP)}
            disabled={!bpm || bpm >= BPM_MAX}
            aria-label="Tăng tempo"
            className="w-9 text-lg leading-none text-soft transition-colors hover:bg-surface-2 hover:text-text disabled:opacity-40"
          >
            +
          </button>
        </div>
        <span className="min-w-0 flex-1 truncate px-1 font-mono text-xs text-soft" aria-live="polite">{info}</span>
        <button type="button" onClick={onCancel} className={buttonSecondary}>
          Đóng
        </button>
        <button type="button" onClick={onSave} disabled={!dirty || saving} className={buttonPrimary}>
          {saving ? "Đang lưu…" : dirty ? "Lưu tab" : "Đã lưu"}
        </button>

        <div className="flex w-full flex-wrap items-center gap-x-4 gap-y-2 border-t border-line pt-2" role="toolbar" aria-label="Công cụ sửa nốt">
          <ToolGroup label="Chèn nốt">
            <Chip onClick={() => run(splitBeat)} disabled={!sel} title="Chia nốt đang chọn thành 2 nốt ngắn bằng nửa — ô không bị thừa phách (phím D)">
              Chia đôi
            </Chip>
            <Chip onClick={() => run(() => insertBeat(false))} disabled={!sel} title="Chèn beat trống cùng trường độ phía trước (Shift + I)">
              + Trước
            </Chip>
            <Chip onClick={() => run(() => insertBeat(true))} disabled={!sel} title="Chèn beat trống cùng trường độ phía sau (phím I)">
              + Sau
            </Chip>
          </ToolGroup>
          <ToolGroup label="Phím">
            <input
              type="number"
              min={0}
              max={24}
              inputMode="numeric"
              placeholder="0–24"
              disabled={!sel}
              aria-label="Số phím cho dây đang chọn — Enter để đặt"
              title="Gõ số phím rồi Enter: đặt nốt vào dây đang chọn (dây trống thì thêm nốt → thành nốt đôi / hợp âm)"
              className="h-8 w-16 rounded-md border border-border bg-bg px-2 text-xs text-text outline-none focus:border-accent disabled:opacity-40"
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                e.preventDefault();
                const v = e.currentTarget.value.trim();
                if (v === "" || !/^\d{1,2}$/.test(v)) return;
                setFret(Number(v));
                e.currentTarget.value = "";
                focusHost();
              }}
            />
            <Chip onClick={() => run(deleteNote)} disabled={!sel?.note} title="Xoá nốt đang chọn (Delete)">Xoá nốt</Chip>
            <Chip onClick={() => run(deleteBeat)} disabled={!sel} title="Xoá cả beat (Shift + Delete)">Xoá beat</Chip>
          </ToolGroup>
          <ToolGroup label="Trường độ">
            {DURATIONS.map((d) => (
              <Chip key={d} on={sel?.duration === d} onClick={() => run(() => setDuration(d))} disabled={!sel} title={`Nốt ${DURATION_NAME[d]} (+ / − để đổi nhanh)`}>
                {DURATION_SHORT[d]}
              </Chip>
            ))}
            <Chip on={!!sel?.dots} onClick={() => run(toggleDot)} disabled={!sel} title="Chấm dôi (phím .)">Chấm</Chip>
          </ToolGroup>
          <ToolGroup label="Ô nhịp">
            <Chip onClick={() => run(insertBar)} disabled={!sel} title="Thêm một ô trống ngay sau ô đang chọn">+ Ô sau</Chip>
            <Chip onClick={() => run(deleteBar)} disabled={!sel} title="Xoá ô đang chọn">Xoá ô</Chip>
          </ToolGroup>
          <ToolGroup label="Kỹ thuật">
            <Chip onClick={() => run(toggleDead)} disabled={!sel} title="Bật/tắt tiếng đập “xx” (phím X)">xx</Chip>
            <Chip onClick={() => run(toggleSlide)} disabled={!sel?.note} title="Luyến sang nốt sau (phím S)">Luyến</Chip>
            <Chip onClick={() => run(toggleLetRing)} disabled={!sel?.note} title="Ngân (phím L)">Ngân</Chip>
          </ToolGroup>
        </div>
      </div>

      {error && <p role="alert" className="rounded-xl border border-red-500/50 bg-red-500/10 px-4 py-2 text-sm text-red-300">{error}</p>}
      {message && !error && <p role="status" className="rounded-xl border border-accent/40 bg-fresh px-4 py-2 text-sm text-accent-ink">{message}</p>}
      {warnings.length > 0 && (
        <div role="alert" className="flex flex-col gap-2 rounded-xl border border-amber-400/50 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
          <p>
            <b>⚠ Có ô chưa đúng số phách.</b> Khi phát, mỗi ô luôn chiếm đủ số phách của nhịp: ô <b>thiếu</b> sẽ có khoảng lặng ở cuối ô,
            ô <b>thừa</b> làm nốt bị dồn. Đổi trường độ cho khớp, hoặc bù bằng dấu lặng:
          </p>
          <ul className="flex flex-col gap-1.5">
            {warnings.map((w) => (
              <li key={w.bar} className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCursor({ bar: w.bar, beat: 0, string: cursorRef.current.string })}
                  className="font-semibold underline-offset-4 hover:underline"
                >
                  Ô {w.bar + 1}
                </button>
                <span>{w.diff < 0 ? "thiếu" : "thừa"} {formatBeats(Math.abs(w.diff))}</span>
                {w.diff < 0 && (
                  <>
                    <Chip onClick={() => run(() => fillBar(w.bar, true))} title="Thêm dấu lặng ở đầu ô — các nốt dồn về cuối và nối liền sang ô sau (hợp với ô mở đầu / lấy đà)">
                      Bù lặng đầu ô
                    </Chip>
                    <Chip onClick={() => run(() => fillBar(w.bar, false))} title="Thêm dấu lặng ở cuối ô">
                      Bù lặng cuối ô
                    </Chip>
                  </>
                )}
                {w.diff > 0 && <span className="text-amber-200/70">→ rút ngắn một nốt hoặc xoá bớt beat</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      <details className="rounded-xl border border-line px-4 py-2 text-sm text-muted" open>
        <summary className="cursor-pointer font-semibold text-soft">Cách dùng &amp; phím tắt</summary>
        <p className="mt-2 text-soft">
          <b>Chèn nốt:</b> chọn nốt → <b>Chia đôi</b> → beat mới trống hiện ra ngay sau → bấm vào dây muốn đặt → gõ số phím.
          {" "}<b>Nốt đôi / hợp âm:</b> bấm vào dây trống ngay trên/dưới nốt có sẵn → gõ số phím.
        </p>
        <ul className="mt-2 grid gap-x-6 gap-y-1 sm:grid-cols-2">
          <li><b className="text-soft">Bấm vào nốt</b>: chọn nốt · <b className="text-soft">bấm vào dây trống</b>: chọn dây đó</li>
          <li><b className="text-soft">← →</b>: beat trước / sau (ô chưa đủ phách thì → tạo thêm chỗ trống trong ô, như Guitar Pro) · <b className="text-soft">↑ ↓</b>: đổi dây</li>
          <li><b className="text-soft">0–9</b>: đặt phím (gõ liền 2 số cho 10–24); dây trống thì thêm nốt → nốt đôi / hợp âm</li>
          <li><b className="text-soft">D</b>: chia đôi nốt để chèn thêm nốt mà ô không thừa phách</li>
          <li><b className="text-soft">I</b> / <b className="text-soft">Shift + I</b>: chèn beat trống sau / trước</li>
          <li><b className="text-soft">Shift + ↑ ↓</b>: chuyển nốt sang dây bên cạnh, giữ cao độ</li>
          <li><b className="text-soft">Delete</b>: xoá nốt · <b className="text-soft">Shift + Delete</b>: xoá cả beat</li>
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
          onPointerDownCapture={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            pointRef.current = { x: e.clientX - r.left, y: e.clientY - r.top };
          }}
          className="relative outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
          aria-label="Vùng sửa tab — bấm vào nốt rồi dùng bàn phím"
        />
        <div ref={boxRef} aria-hidden className="pointer-events-none absolute hidden rounded-md border-2 border-accent bg-accent/15" style={{ zIndex: 5 }} />
      </div>
      {!ready && !error && <p className="text-sm text-muted">Đang nạp tab…</p>}
    </section>
  );
}

function ToolGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={label}>
      <span className="mr-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</span>
      {children}
    </div>
  );
}

/** Nút nhỏ trên thanh công cụ; không lấy focus để bàn phím vẫn điều khiển vùng tab */
function Chip({ on = false, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { on?: boolean }) {
  const look = on ? "border-accent bg-fresh text-accent-ink" : "border-border bg-bg text-soft hover:border-muted hover:text-text";
  return (
    <button
      type="button"
      aria-pressed={on || undefined}
      onMouseDown={(e) => e.preventDefault()}
      {...props}
      className={`inline-flex h-8 items-center justify-center rounded-md border px-2.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${look}`}
    />
  );
}

/** 960 tick = 1 phách (nốt đen) → "1¼ phách"; lẻ hơn móc kép thì đếm móc ba */
function formatBeats(ticks: number) {
  if (ticks % 240 !== 0) return `${ticks / 120} móc ba`;
  const whole = Math.floor(ticks / 960), frac = ["", "¼", "½", "¾"][(ticks % 960) / 240];
  return `${whole || !frac ? whole : ""}${frac} phách`;
}
