// Đọc tab từ PDF xuất bởi Guitar Pro.
// - Dây / phím: số trên khuông tab (chữ thật trong PDF, có toạ độ).
// - Trường độ: đọc từ khuông nhạc — đầu nốt đặc/rỗng, số gạch nối hoặc đuôi móc, chấm dôi, dấu lặng.
// Kích thước ký hiệu được đo trên PDF Guitar Pro (đơn vị điểm PDF, khổ A4).
import type { PDFDocumentProxy } from "pdfjs-dist/legacy/build/pdf.mjs";
import { type Fill, type MusicGlyph, pageGeometry, type PdfOps, type Segment } from "./geometry.ts";

export type TabNote = { string: number; fret: number | null; dead: boolean; tie: boolean; harmonic: boolean; slide: boolean };
export type TabBeat = {
  /** 1 = tròn, 2 = trắng, 4 = đen, 8 = móc đơn, 16 = móc kép… */
  dur: number;
  dots: number;
  rest: boolean;
  notes: TabNote[];
  chord?: string;
  arpeggio: boolean;
  /** Nốt hoa mỹ (láy) — in nhỏ, không chiếm phách */
  grace?: boolean;
};
export type TabBar = { page: number; beats: TabBeat[]; /** số phách đen */ length: number; warnings: string[] };
export type ParsedTab = {
  title: string | null;
  tempo: number | null;
  capo: number;
  /** Tên nhạc cụ in ở đầu khuông, vd. "S-Gt" (guitar dây sắt), "N-Gt" (dây nylon) */
  instrumentLabel: string | null;
  bars: TabBar[];
  warnings: string[];
};

type Staff = { kind: "tab" | "std"; lines: number[]; x0: number; x1: number };
type Kind = "beam" | "stem" | "head-open" | "head-black" | "head-whole" | "dot" | "flag1" | "flag2" | "flag3" | "rest-block" | "other";
type Glyph = Fill & { kind: Kind; /** ký hiệu cỡ nhỏ — của nốt hoa mỹ */ small?: boolean };
type Column = {
  x: number;
  sx?: number;
  stem?: Glyph | null;
  heads?: Glyph[];
  dur: number;
  dots: number;
  rest?: boolean;
  /** Tâm dọc của dấu lặng — dấu lặng bè trên đặt cao, bè dưới đặt thấp */
  y?: number;
  notes: TabNote[];
  chord?: string;
  arpeggio?: boolean;
  grace?: boolean;
};

const near = (a: number, b: number, tol: number) => Math.abs(a - b) <= tol;
const median = (xs: number[]) => (xs.length ? [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] : 0);
const isHorizontalLine = (s: Segment) => near(s.y0, s.y1, 0.2) && Math.abs(s.x1 - s.x0) > 40;

/** Gom dòng kẻ ngang thành khuông 5 dòng (khuông nhạc) hoặc 6 dòng (tab); ghép thành từng hệ */
function findSystems(segments: Segment[]) {
  const lines = segments.filter(isHorizontalLine);
  const ys = [...new Set(lines.map((s) => +s.y0.toFixed(1)))].sort((a, b) => a - b);
  const staves: Staff[] = [];
  for (let i = 0; i < ys.length; ) {
    let n = 1;
    const d = ys[i + 1] - ys[i];
    while (i + n < ys.length && near(ys[i + n] - ys[i + n - 1], d, 0.3)) n++;
    const kind = n === 6 && d > 5.5 && d < 8 ? "tab" : n === 5 && d > 3.5 && d < 5.5 ? "std" : null;
    if (kind) {
      const ls = ys.slice(i, i + n);
      const segs = lines.filter((s) => near(s.y0, ls[0], 0.25));
      staves.push({ kind, lines: ls, x0: Math.min(...segs.map((s) => Math.min(s.x0, s.x1))), x1: Math.max(...segs.map((s) => Math.max(s.x0, s.x1))) });
      i += n;
    } else i += 1; // dòng lẻ (vd. dòng phụ ngay trên khuông) → thử lại từ dòng kế tiếp, không bỏ cả nhóm
  }
  return staves
    .filter((s) => s.kind === "tab")
    .map((tab) => ({
      tab,
      std: staves.filter((s) => s.kind === "std" && s.lines[4] < tab.lines[0] && tab.lines[0] - s.lines[4] < 120).pop(),
    }));
}

/** Vạch nhịp: nét dọc phủ hết chiều cao khuông tab. Vạch kép / vạch lặp gộp thành một. */
/**
 * `filled`: vạch nhịp Guitar Pro 8 tô thành hình chữ nhật mảnh (luôn nhận). Nét kẻ thì ở bản Guitar Pro 8
 * chỉ là vạch đầu dòng (kẻ từ khuông nhạc xuống) — nét dọc chỉ nằm trong khuông tab là mũi tên rải hợp âm.
 */
function findBarlines(segments: Segment[], tab: Staff, std?: Staff, filled?: Segment[]) {
  const top = tab.lines[0];
  const bot = tab.lines[5];
  const strokes = new Set(segments);
  const xs = [...segments, ...(filled ?? [])]
    .filter((s) => {
      const y0 = Math.min(s.y0, s.y1), y1 = Math.max(s.y0, s.y1);
      if (!near(s.x0, s.x1, 0.2) || y0 > top + 0.6 || y1 < bot - 0.6) return false;
      // Guitar Pro 8 kẻ vạch nhịp suốt từ khuông nhạc xuống khuông tab; nét dọc chỉ nằm trong khuông tab
      // (vd. mũi tên rải hợp âm) thì không phải vạch nhịp
      if (filled && std !== undefined && strokes.has(s) && y0 > std.lines[4] + 2) return false;
      // Có dòng lời bài hát ở giữa thì vạch rất dài, nhưng không vượt lên trên khuông nhạc của chính hệ đó
      // (nét ngoặc nối nhiều hệ thì có)
      return y1 - y0 < (bot - top) * 3 || (std !== undefined && y0 >= std.lines[0] - 3);
    })
    .map((s) => s.x0)
    .sort((a, b) => a - b);
  const clusters: number[][] = [];
  for (const x of xs) {
    const last = clusters[clusters.length - 1];
    if (last && x - last[last.length - 1] < 6) last.push(x);
    else clusters.push([x]);
  }
  return clusters.map((c) => ({ start: c[c.length - 1], end: c[0] }));
}

const TAB_TOKEN = /^(\()?(<)?(\d{1,2}|X|x)(>)?(\))?$/;
const CHORD = /^[A-G][#b]?(m|maj|min|dim|aug|sus|add|M)?\d*(sus\d|add\d|b5|#5)?(\/[A-G][#b]?)?$/;

/**
 * Guitar Pro 8 in ký hiệu nhạc bằng phông SMuFL thay vì vẽ hình: mã ký tự → loại ký hiệu.
 * Đầu nốt đen / X (nốt chết) / trắng / tròn, đuôi móc đơn–kép–ba, chấm dôi.
 */
const SMUFL_KIND: Record<number, Kind> = {
  0xe0a4: "head-black",
  0xe0a9: "head-black",
  0xe0a3: "head-open",
  0xe0a2: "head-whole",
  0xe240: "flag1",
  0xe241: "flag1",
  0xe242: "flag2",
  0xe243: "flag2",
  0xe244: "flag3",
  0xe245: "flag3",
  0xe1e7: "dot",
};
/** Dấu lặng SMuFL → trường độ (1 = tròn … 32 = móc ba) */
const SMUFL_REST: Record<number, number> = { 0xe4e3: 1, 0xe4e4: 2, 0xe4e5: 4, 0xe4e6: 8, 0xe4e7: 16, 0xe4e8: 32 };

/** Khung bao của ký hiệu SMuFL quanh gốc ký tự (1 khoảng khuông = 1/4 cỡ phông) */
function smuflGlyph(g: MusicGlyph, kind: Kind): Glyph {
  const sp = g.size / 4;
  const half = kind.startsWith("flag") ? sp * 3.5 : kind === "dot" ? sp * 0.15 : sp / 2;
  return { x0: g.x, x1: g.x + g.w, y0: g.y - half, y1: g.y + half, n: 0, op: 0, kind };
}

/**
 * Dấu lặng đen / móc đơn / móc kép của Guitar Pro 7 (vẽ thành hình) → trường độ.
 * Đo trên PDF Guitar Pro 7: lặng đen và móc kép cùng 96 điểm, khác bề rộng.
 */
function gp7Rest(f: Fill): number | null {
  if (f.op !== 22) return null;
  const w = f.x1 - f.x0;
  const h = f.y1 - f.y0;
  if (f.n === 96 && near(h, 12, 0.6)) return w < 4.7 ? 4 : 16;
  if (f.n === 54 && near(w, 4.3, 0.4) && near(h, 8, 0.5)) return 8;
  return null;
}

function classify(f: Fill, smufl: boolean): Kind {
  const w = f.x1 - f.x0;
  const h = f.y1 - f.y0;
  // gạch nối: hình bình hành (Guitar Pro 8 tô bằng lệnh khác nhưng vẫn là hình 4 đỉnh khép kín)
  if ((f.op === 24 || (smufl && f.op === 22 && f.n === 5)) && w > 3) return "beam";
  if (smufl) return w < 0.8 && h > 6 ? "stem" : "other"; // đầu nốt, đuôi móc… là ký tự, không phải hình
  if (w < 0.8 && h > 6) return "stem";
  if (w >= 5 && w <= 8.6 && h >= 4.4 && h <= 6.6 && f.op === 22) {
    if (f.n === 32 || f.n === 10 || f.n === 29) return "head-open"; // tròn rỗng, thoi rỗng (hoà âm)
    if (f.n === 13 || f.n === 5 || f.n === 47) return "head-black"; // đặc, thoi đặc, chữ X
  }
  // Nốt tròn: hình ít điểm — chữ cường độ như "mf" cùng cỡ nhưng có hàng trăm điểm
  if (w >= 8.6 && w <= 11 && h >= 4.4 && h <= 6.6 && f.op === 22 && f.n < 60) return "head-whole";
  if (w >= 1.5 && w <= 2.5 && h >= 1.5 && h <= 2.5 && f.n === 13) return "dot";
  if (w >= 3.8 && w <= 5.2 && h >= 8.5 && h <= 11 && f.n === 42) return "flag1";
  // (hình 96 điểm cùng cỡ là dấu lặng đen / móc kép — đứng riêng, không gắn đuôi nốt)
  if (w >= 3.8 && w <= 5.6 && h >= 11 && h <= 17 && f.n > 50 && f.n !== 96) return "flag2";
  if (f.op === 23 && w >= 3.5 && w <= 5 && h >= 1.8 && h <= 2.8) return "rest-block";
  return "other";
}

/** Hướng đuôi nốt của một cột: lên / xuống / không có đuôi */
function stemDir(c: Column): "up" | "down" | null {
  if (!c.stem || !c.heads?.length) return null;
  return c.stem.y0 < Math.min(...c.heads.map((h) => h.y0)) - 1 ? "up" : "down";
}
const lengthOf = (c: Column) => (4 / c.dur) * (c.dots ? 1.5 : 1);

/**
 * Ô viết 2 bè: cùng một chỗ có cả nốt đuôi lên lẫn nốt đuôi xuống, hoặc nốt không đuôi (tròn / trắng ngân)
 * đứng cạnh nốt có đuôi. Một bè thì mỗi chỗ chỉ có một cột (hợp âm dùng chung một đuôi).
 */
function isMultiVoice(cols: Column[]) {
  const notes = cols.filter((c) => !c.rest && !c.grace && c.heads?.length);
  for (const a of notes) {
    for (const b of notes) {
      if (a === b || Math.abs(a.x - b.x) > 9) continue; // nốt tròn của bè kia đặt lệch sang bên, tâm cách vài điểm
      const da = stemDir(a);
      const db = stemDir(b);
      if ((da && db && da !== db) || !a.stem !== !b.stem) return true;
    }
  }
  return false;
}

/** Trường độ (tính bằng phách đen) → các nốt ghi được: tròn, trắng chấm, trắng, đen chấm… */
const NOTE_VALUES: [number, number, number][] = [
  [4, 1, 0], [3, 2, 1], [2, 2, 0], [1.5, 4, 1], [1, 4, 0], [0.75, 8, 1], [0.5, 8, 0], [0.375, 16, 1], [0.25, 16, 0], [0.125, 32, 0],
];
function splitLength(q: number) {
  const out: { dur: number; dots: number }[] = [];
  let left = q;
  for (const [value, dur, dots] of NOTE_VALUES) {
    while (left >= value - 1e-6) {
      out.push({ dur, dots });
      left -= value;
    }
  }
  return out;
}

/**
 * Gộp 2 bè thành một dãy beat để phát: tính thời điểm vang của từng cột trong bè của nó (bè trên = đuôi lên,
 * bè dưới = đuôi xuống / nốt tròn bass), rồi xếp mọi nốt theo thời điểm; mỗi beat kéo dài tới nốt vang kế tiếp.
 * Nốt bass ngân dài vẫn ngân nhờ let ring. `carried`: nốt cuối ô trước — nối sang nếu ô mở đầu bằng nốt ngân.
 */
function flattenVoices(cols: Column[], std: Staff, carried: TabNote[]): TabBeat[] | null {
  const hasUp = cols.some((c) => stemDir(c) === "up");
  const noteVoice = (c: Column) => {
    const d = stemDir(c);
    if (d) return d === "up" ? 1 : 2;
    return hasUp ? 2 : 1;
  };
  const voiceOf = (c: Column) => {
    if (!c.rest) return noteVoice(c);
    // Dấu lặng đứng cùng chỗ với nốt của một bè thì thuộc bè kia (bè đó đang có nốt ở thời điểm này)
    const beside = cols.find((n) => !n.rest && !n.grace && n.heads?.length && Math.abs(n.x - c.x) < 4);
    if (beside) return noteVoice(beside) === 1 ? 2 : 1;
    return (c.y ?? 0) <= std.lines[2] ? 1 : 2;
  };
  type Event = { x: number; notes: TabNote[]; rest: boolean; chord?: string; arpeggio: boolean };
  const events = new Map<number, Event>();
  // Mỗi bè: các cột cùng chỗ (vd. hợp âm trắng + nốt bass tròn) vang cùng lúc → một bước;
  // bước kế tiếp bắt đầu sau nốt ngắn nhất của bước này
  const voices = [1, 2].map((v) => {
    const steps: { t: number; cols: Column[] }[] = [];
    let t = 0;
    let end = 0;
    const list = cols.filter((c) => !c.grace && voiceOf(c) === v).sort((a, b) => a.x - b.x);
    for (let i = 0; i < list.length; ) {
      const group = [list[i]];
      while (i + group.length < list.length && list[i + group.length].x - list[i].x < 6) group.push(list[i + group.length]);
      steps.push({ t, cols: group });
      end = Math.max(end, ...group.map((c) => t + lengthOf(c)));
      t += Math.min(...group.map(lengthOf));
      i += group.length;
    }
    return { steps, length: Math.max(t, end) };
  });
  const barLength = Math.max(4, ...voices.map((v) => v.length));
  voices.forEach((voice, i) => {
    // Bè giai điệu vào muộn (Guitar Pro không in dấu lặng đầu ô) → căn về cuối ô
    const first = voice.steps[0]?.cols[0];
    const missing = barLength - voice.length;
    const shift = i === 0 && first && !first.rest && missing > 0.99 && Number.isInteger(Math.round(missing * 1000) / 1000) ? missing : 0;
    for (const { t, cols: group } of voice.steps) {
      for (const c of group) {
        if (!c.rest && !c.notes.length) continue;
        const key = Math.round((t + shift) * 1000) / 1000;
        const e = events.get(key) ?? { x: c.x, notes: [], rest: false, arpeggio: false };
        e.x = Math.min(e.x, c.x);
        if (c.rest) e.rest = true;
        for (const n of c.notes) if (!e.notes.some((m) => m.string === n.string)) e.notes.push(n);
        e.chord ??= c.chord;
        e.arpeggio ||= Boolean(c.arpeggio);
        events.set(key, e);
      }
    }
  });
  const graces = cols.filter((c) => c.grace && !c.rest && c.notes.length);
  const onsets = [...events.keys()].sort((a, b) => a - b);
  // Kiểm tra: nốt vang sau phải nằm bên phải trên sheet — ngược thì đã đoán sai bè, không dùng kết quả này
  for (let i = 1; i < onsets.length; i++) {
    if (events.get(onsets[i])!.x < events.get(onsets[i - 1])!.x - 8) return null;
  }
  const beats: TabBeat[] = [];
  const push = (length: number, notes: TabNote[], first: Partial<TabBeat> = {}) =>
    splitLength(length).forEach((p, k) =>
      beats.push({
        ...p,
        rest: notes.length === 0,
        notes: k === 0 ? notes : notes.map((n) => ({ ...n, tie: true, slide: false })),
        arpeggio: false,
        ...(k === 0 ? first : {}),
      }),
    );
  // Ô mở đầu bằng nốt ngân từ ô trước
  if (onsets.length && onsets[0] > 0) push(onsets[0], carried.map((n) => ({ ...n, tie: true, slide: false })));
  onsets.forEach((t, i) => {
    const e = events.get(t)!;
    const prevX = i ? events.get(onsets[i - 1])!.x : -Infinity;
    for (const g of graces.filter((g) => g.x < e.x && g.x > prevX)) {
      beats.push({ dur: g.dur, dots: 0, rest: false, notes: g.notes.sort((a, b) => a.string - b.string), arpeggio: false, grace: true });
    }
    const end = i + 1 < onsets.length ? onsets[i + 1] : barLength;
    const notes = e.notes.sort((a, b) => a.string - b.string);
    push(end - t, e.rest && !notes.length ? [] : notes, { chord: e.chord, arpeggio: e.arpeggio });
  });
  return beats;
}

export async function parseGuitarProPdf(doc: PDFDocumentProxy, OPS: PdfOps): Promise<ParsedTab> {
  const out: ParsedTab = { title: null, tempo: null, capo: 0, instrumentLabel: null, bars: [], warnings: [] };
  let prevNotes: TabNote[] = [];

  for (let pn = 1; pn <= doc.numPages; pn++) {
    const g = await pageGeometry(await doc.getPage(pn), OPS);
    if (pn === 1) out.title = [...g.texts].filter((t) => t.y < 120).sort((a, b) => b.h - a.h)[0]?.str.trim() ?? null;
    for (const t of g.texts) {
      const tempo = t.str.match(/=\s*(\d{2,3})\b/);
      if (tempo && !out.tempo) out.tempo = Number(tempo[1]);
      const capo = t.str.match(/capo[^\d]*(\d+)/i);
      if (capo) out.capo = Number(capo[1]);
      if (!out.instrumentLabel && /^[A-Z]-Gt$/.test(t.str.trim())) out.instrumentLabel = t.str.trim();
    }

    // Guitar Pro 8: ký hiệu nhạc là ký tự phông SMuFL (bản cũ vẽ thành hình, không có ký tự nào kiểu này)
    const smufl = g.glyphs.length > 0;
    const seen = new Set<string>();
    const glyphs: Glyph[] = [];
    for (const f of g.fills) {
      const key = `${f.x0.toFixed(2)},${f.y0.toFixed(2)},${f.x1.toFixed(2)},${f.n}`;
      if (seen.has(key)) continue; // Guitar Pro vẽ nhiều hình hai lần
      seen.add(key);
      glyphs.push({ ...f, kind: classify(f, smufl) });
    }
    if (smufl) {
      // Guitar Pro 8 kẻ đuôi nốt bằng nét dọc (bản cũ tô thành hình mảnh)
      for (const sg of g.segments) {
        if (!near(sg.x0, sg.x1, 0.2) || Math.abs(sg.y1 - sg.y0) <= 6) continue;
        const x = (sg.x0 + sg.x1) / 2;
        glyphs.push({ x0: x - 0.3, x1: x + 0.3, y0: Math.min(sg.y0, sg.y1), y1: Math.max(sg.y0, sg.y1), n: 0, op: 0, kind: "stem" });
      }
    }
    // Dấu lặng mọi trường độ (trừ lặng tròn / trắng của Guitar Pro 7 — xem "rest-block")
    const smuflRests: (Glyph & { dur: number })[] = [];
    if (!smufl) {
      for (const f of glyphs) {
        const dur = f.kind === "other" ? gp7Rest(f) : null;
        if (dur) smuflRests.push({ ...f, dur });
      }
    }
    // Cỡ đầu nốt thường của trang — đầu nốt nhỏ hơn hẳn là nốt hoa mỹ
    const headSize = median(g.glyphs.filter((m) => SMUFL_KIND[m.code]?.startsWith("head")).map((m) => m.size));
    for (const m of g.glyphs) {
      const kind = SMUFL_KIND[m.code];
      if (kind) glyphs.push({ ...smuflGlyph(m, kind), small: m.size < headSize * 0.85 });
      else if (SMUFL_REST[m.code]) smuflRests.push({ ...smuflGlyph(m, "other"), dur: SMUFL_REST[m.code] });
    }

    // Guitar Pro 8 tô vạch nhịp thành hình chữ nhật mảnh thay vì kẻ nét → đổi thành nét dọc
    const verticalBars: Segment[] = g.fills
      .filter((f) => f.x1 - f.x0 < 1.2 && f.y1 - f.y0 > 10)
      .map((f) => ({ x0: (f.x0 + f.x1) / 2, x1: (f.x0 + f.x1) / 2, y0: f.y0, y1: f.y1 }));

    for (const { tab, std } of findSystems(g.segments)) {
      if (!std && !smufl) {
        out.warnings.push(`Trang ${pn}: khuông tab không có khuông nhạc đi kèm`);
        continue;
      }
      // Không có khuông nhạc (sheet chỉ có tab): trường độ là đuôi nốt + gạch nối kẻ ngay dưới khuông tab
      const zoneTop = std ? std.lines[0] - 45 : tab.lines[0] - 12;
      const zoneBot = std ? Math.min(std.lines[4] + 45, tab.lines[0] - 3) : tab.lines[5] + 45;
      const zone = glyphs.filter((f) => f.y0 >= zoneTop && f.y1 <= zoneBot);
      const of = (k: Kind) => zone.filter((f) => f.kind === k);
      const heads = zone.filter((f) => f.kind.startsWith("head"));
      const stems = of("stem");
      const beams = of("beam");
      const flags = zone.filter((f) => f.kind === "flag1" || f.kind === "flag2" || f.kind === "flag3");
      const dots = of("dot");
      const restBlocks = of("rest-block");
      const arpeggios = zone.filter((f) => near(f.x1 - f.x0, 3.3, 0.4) && near(f.y1 - f.y0, 4.9, 0.4) && f.n === 28);

      const barlines = findBarlines(g.segments, tab, std, smufl ? verticalBars : undefined);
      // Dòng kẻ tab bị ngắt quanh các con số → mép khuông lấy theo vạch nhịp đầu / cuối dòng
      const left = Math.min(tab.x0, ...barlines.map((b) => b.end));
      const right = Math.max(tab.x1, ...barlines.map((b) => b.start));
      const tokens = g.texts
        .filter((t) => t.y >= tab.lines[0] - 2 && t.y <= tab.lines[5] + 6 && t.x >= left && t.x <= right)
        .flatMap((t) => {
          const m = t.str.trim().match(TAB_TOKEN);
          if (!m) return [];
          const mid = t.y - t.h * 0.23;
          let string = 1;
          let best = Infinity;
          tab.lines.forEach((ly, i) => {
            const d = Math.abs(ly - mid);
            if (d < best) {
              best = d;
              string = i + 1;
            }
          });
          const dead = /x/i.test(m[3]);
          return [{ x: t.x + t.w / 2, right: t.x + t.w, y: tab.lines[string - 1], h: t.h, small: false, string, fret: dead ? null : Number(m[3]), dead, tie: Boolean(m[1] && m[5]), harmonic: Boolean(m[2] && m[4]) }];
        });
      // Guitar Pro 8 in số của nốt hoa mỹ nhỏ hơn số thường
      if (smufl) {
        const tokenSize = median(tokens.map((t) => t.h));
        for (const t of tokens) t.small = t.h < tokenSize * 0.88;
      }
      // Nét luyến trên tab: đoạn chéo nối hai số cùng dây
      const slides = g.segments.filter((s) => {
        const dx = Math.abs(s.x1 - s.x0);
        const dy = Math.abs(s.y1 - s.y0);
        return dx > 2 && dx < 45 && dy > 0.8 && dy < 6 && Math.min(s.y0, s.y1) >= tab.lines[0] - 4 && Math.max(s.y0, s.y1) <= tab.lines[5] + 4;
      });
      const chordBase = std ? std.lines[0] : tab.lines[0];
      const chords = g.texts.filter((t) => CHORD.test(t.str.trim()) && t.y < chordBase && t.y > chordBase - 60);

      for (let bi = 0; bi + 1 < barlines.length; bi++) {
        const bar = { x0: barlines[bi].start, x1: barlines[bi + 1].end };
        if (bar.x1 - bar.x0 < 15) continue; // khe giữa hai nét của vạch kép / vạch lặp
        const inBar = (x: number) => x > bar.x0 + 0.5 && x < bar.x1 - 0.5;
        const warnings: string[] = [];

        const cols: Column[] = [];
        if (!std) {
          // Sheet chỉ có tab: mỗi cột số là một beat; đếm gạch nối / đuôi móc ở đuôi nốt bên dưới
          const groups: (typeof tokens)[] = [];
          for (const t of tokens.filter((t) => inBar(t.x)).sort((a, b) => a.x - b.x)) {
            const last = groups[groups.length - 1];
            if (last && t.x - last[last.length - 1].x <= 2.5) last.push(t);
            else groups.push([t]);
          }
          for (const group of groups) {
            const x = group[0].x;
            if (group.every((t) => t.small)) {
              cols.push({ x, dur: 16, dots: 0, notes: [], grace: true });
              continue;
            }
            const st = stems.find((s) => near((s.x0 + s.x1) / 2, x, 1.5) && s.y1 > tab.lines[5]) ?? null;
            let n = 0;
            if (st) {
              const sx = (st.x0 + st.x1) / 2;
              n = new Set(beams.filter((b) => sx >= b.x0 - 0.7 && sx <= b.x1 + 0.7 && b.y1 >= st.y1 - 6 && b.y0 <= st.y1 + 1.5).map((b) => `${b.x0.toFixed(1)},${b.y0.toFixed(1)}`)).size;
              const fl = flags.filter((f) => near(f.x0, sx, 1.5) && f.y1 >= st.y1 - 6 && f.y0 <= st.y1 + 6);
              if (!n && fl.length) n = fl.some((f) => f.kind === "flag3") ? 3 : fl.some((f) => f.kind === "flag2") ? 2 : 1;
            }
            const dotted = dots.some((d) => d.x0 > x + 1 && d.x0 < x + 12);
            cols.push({ x, stem: st, dur: [4, 8, 16, 32, 64][Math.min(n, 4)], dots: dotted ? 1 : 0, notes: [] });
          }
        }
        // Gom đầu nốt theo đuôi nốt → mỗi cột là một beat
        const barHeads = heads.filter((h) => inBar((h.x0 + h.x1) / 2));
        const used = new Set<Glyph>();
        for (const st of stems.filter((s) => inBar(s.x0))) {
          const sx = (st.x0 + st.x1) / 2;
          // Nốt tròn không có đuôi — không ghép vào đuôi của nốt bè kia đứng cùng chỗ
          const hs = barHeads.filter(
            (h) => h.kind !== "head-whole" && !used.has(h) && sx >= h.x0 - 0.8 && sx <= h.x1 + 0.8 && h.y1 >= st.y0 - 1.5 && h.y0 <= st.y1 + 1.5,
          );
          if (!hs.length) continue;
          hs.forEach((h) => used.add(h));
          cols.push({ x: 0, stem: st, sx, heads: hs, dur: 4, dots: 0, notes: [] });
        }
        for (const h of barHeads.filter((h) => !used.has(h))) {
          // Nốt không đuôi cùng chỗ (vd. nốt tròn của 2 bè đặt lệch nhau) → chung một cột
          const c = cols.find((c) => !c.stem && c.heads && near((c.heads[0].x0 + c.heads[0].x1) / 2, (h.x0 + h.x1) / 2, 7));
          if (c) c.heads!.push(h);
          else cols.push({ x: 0, stem: null, heads: [h], dur: 4, dots: 0, notes: [] });
        }
        // Một đuôi mang cả đầu nốt đen lẫn đầu nốt trắng = 2 bè chung chỗ (giai điệu 1 phách + hợp âm ngân 2 phách)
        // → tách làm 2 cột cùng vị trí để mỗi phần có trường độ riêng
        for (const c of [...cols]) {
          const open = c.heads?.filter((h) => h.kind === "head-open") ?? [];
          if (!open.length || open.length === c.heads!.length) continue;
          c.heads = c.heads!.filter((h) => h.kind !== "head-open");
          cols.push({ ...c, heads: open, notes: [] });
        }
        for (const c of cols) {
          if (!c.heads) continue; // cột của sheet chỉ có tab — đã tính trường độ ở trên
          const hs = c.heads;
          c.x = hs.reduce((s, h) => s + (h.x0 + h.x1) / 2, 0) / hs.length;
          if (hs.every((h) => h.small)) {
            c.grace = true;
            c.dur = 16;
            continue;
          }
          const open = hs.some((h) => h.kind === "head-open");
          if (hs.some((h) => h.kind === "head-whole") || (open && !c.stem)) c.dur = 1;
          else if (open) c.dur = 2;
          else {
            let n = 0;
            if (c.stem && c.sx !== undefined) {
              const s = c.stem;
              const sx = c.sx;
              n = new Set(beams.filter((b) => sx >= b.x0 - 0.7 && sx <= b.x1 + 0.7 && b.y1 >= s.y0 - 1 && b.y0 <= s.y1 + 1).map((b) => `${b.x0.toFixed(1)},${b.y0.toFixed(1)}`)).size;
              const fl = flags.filter((f) => near(f.x0, sx, 1.2) && f.y1 >= s.y0 - 2 && f.y0 <= s.y1 + 2);
              if (!n && fl.length) n = fl.some((f) => f.kind === "flag3") ? 3 : fl.some((f) => f.kind === "flag2") ? 2 : 1;
            }
            c.dur = [4, 8, 16, 32, 64][Math.min(n, 4)];
          }
          const right = Math.max(...hs.map((h) => h.x1));
          const top = Math.min(...hs.map((h) => h.y0));
          const bottom = Math.max(...hs.map((h) => h.y1));
          c.dots = dots.some((d) => d.x0 > right - 0.5 && d.x0 < right + 7 && d.y0 >= top - 3 && d.y1 <= bottom + 3) ? 1 : 0;
          const left = Math.min(...hs.map((h) => h.x0));
          c.arpeggio = arpeggios.some((a) => a.x1 <= left + 0.5 && a.x1 > left - 10);
        }
        // Dấu lặng tròn (treo dưới dòng 4) / lặng trắng (đặt trên dòng 3)
        for (const r of std ? restBlocks.filter((r) => inBar(r.x0)) : []) {
          const whole = r.y0 < std!.lines[1] + 0.5 && r.y1 <= std!.lines[2] + 0.6;
          cols.push({ x: (r.x0 + r.x1) / 2, y: (r.y0 + r.y1) / 2, rest: true, dur: whole ? 1 : 2, dots: 0, notes: [] });
        }
        // Dấu lặng đen, móc đơn, móc kép… (Guitar Pro 8: ký tự SMuFL; 7: hình) — kèm chấm dôi nếu có
        for (const r of smuflRests.filter((r) => inBar((r.x0 + r.x1) / 2) && r.y0 >= zoneTop && r.y1 <= zoneBot)) {
          const dotted = dots.some((d) => d.x0 > r.x1 - 0.5 && d.x0 < r.x1 + 7 && near(d.y0, r.y0, 8));
          cols.push({ x: (r.x0 + r.x1) / 2, y: (r.y0 + r.y1) / 2, rest: true, dur: r.dur, dots: dotted ? 1 : 0, notes: [] });
        }
        cols.sort((a, b) => a.x - b.x);

        // Ghép số trên tab vào cột gần nhất (số nhỏ của nốt hoa mỹ → cột hoa mỹ, nếu có)
        const hasGrace = cols.some((c) => c.grace);
        for (const t of tokens.filter((t) => inBar(t.x))) {
          let best: Column | null = null;
          let bd = Infinity;
          for (const c of cols) {
            if (c.rest || (hasGrace && Boolean(c.grace) !== t.small)) continue;
            const d = Math.abs(c.x - t.x);
            if (d < bd) {
              bd = d;
              best = c;
            }
          }
          if (!best || bd > 5) {
            warnings.push(`số "${t.dead ? "X" : t.fret}" trên dây ${t.string} không khớp nốt nào`);
            continue;
          }
          const slide = slides.some((s) => near(Math.min(s.x0, s.x1), t.right, 3) && near((s.y0 + s.y1) / 2, t.y, 4));
          best.notes.push({ string: t.string, fret: t.fret, dead: t.dead, tie: t.tie, harmonic: t.harmonic, slide });
        }
        // Ô viết 2 bè (giai điệu + bass): mỗi bè có trường độ riêng → gộp theo thời điểm vang ở dưới.
        // Chỉ làm khi xếp một hàng thì ô dài quá 4 phách — dấu hiệu chắc chắn 2 bè đang chồng lên nhau.
        const oneLine = cols.reduce((sum, c) => sum + (c.grace ? 0 : lengthOf(c)), 0);
        const multi = std !== undefined && oneLine > 4.01 && isMultiVoice(cols);
        const carried = prevNotes;
        // Cột có đầu nốt nhưng không có số trên tab: nốt nối từ phách trước (Guitar Pro không in lại số)
        for (const c of cols) {
          if (c.rest) continue;
          if (c.grace) {
            if (!c.notes.length) c.rest = true; // không tìm được số → bỏ qua (xoá ở dưới)
            continue;
          }
          if (c.notes.length) prevNotes = c.notes;
          else if (multi) continue; // 2 bè: nốt ngân của bè kia, không phát lại
          else if (prevNotes.length) {
            c.notes = prevNotes.map((n) => ({ ...n, tie: true, slide: false }));
            prevNotes = c.notes;
          } else {
            c.rest = true;
            warnings.push("có nốt không có số trên tab — coi là dấu lặng");
          }
        }
        for (const ch of chords) {
          const cx = ch.x + ch.w / 2;
          if (!inBar(cx)) continue;
          const c = cols.filter((c) => !c.rest).sort((a, b) => Math.abs(a.x - cx) - Math.abs(b.x - cx))[0];
          if (c) c.chord = ch.str.trim();
        }

        const oneLineBeats = () => cols
          .filter((c) => !(c.grace && c.rest))
          .map((c) => ({
            dur: c.dur,
            dots: c.dots,
            rest: Boolean(c.rest) || !c.notes.length, // nốt ngân của bè kia (không có số) → để ngân, không phát lại
            notes: c.notes.sort((a, b) => a.string - b.string),
            chord: c.chord,
            arpeggio: Boolean(c.arpeggio),
            grace: c.grace,
          }));
        // Gộp 2 bè chỉ khi không làm rơi nốt nào (2 nốt cùng dây cùng lúc sẽ bị gộp làm một)
        const played = (bs: TabBeat[]) => bs.reduce((n, b) => n + b.notes.filter((x) => !x.tie).length, 0);
        const merged = multi ? flattenVoices(cols, std!, carried) : null;
        const plain = oneLineBeats();
        const beats: TabBeat[] = merged && played(merged) >= played(plain) ? merged : plain;
        const length = beats.reduce((s, b) => s + (b.grace ? 0 : (4 / b.dur) * (b.dots ? 1.5 : 1)), 0);
        out.bars.push({ page: pn, beats, length, warnings });
      }
    }
  }
  return out;
}
