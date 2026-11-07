/** Mẫu tab trống để soạn từ đầu trong admin (alphaTex → trình sửa tab). */

export const TUNINGS = [
  { id: "standard", label: "Chuẩn (E A D G B E)", notes: "E4 B3 G3 D3 A2 E2" },
  { id: "g5", label: "Hạ dây 5 xuống G (E G D G B E)", notes: "E4 B3 G3 D3 G2 E2" },
  { id: "dropd", label: "Drop D (D A D G B E)", notes: "E4 B3 G3 D3 A2 D2" },
  { id: "dadgad", label: "DADGAD", notes: "D4 A3 G3 D3 A2 D2" },
  { id: "openg", label: "Open G (D G D G B D)", notes: "D4 B3 G3 D3 G2 D2" },
] as const;

export const TIME_SIGNATURES = [
  { id: "4/4", num: 4, den: 4 },
  { id: "3/4", num: 3, den: 4 },
  { id: "2/4", num: 2, den: 4 },
  { id: "6/8", num: 6, den: 8 },
] as const;

/** Lưới nốt trống trong mỗi ô: bấm vào dấu lặng rồi gõ số phím để đặt nốt */
export const GRIDS = [
  { value: 8, label: "Móc đơn" },
  { value: 16, label: "Móc kép" },
  { value: 4, label: "Nốt đen" },
] as const;

export type NewTabOptions = {
  title: string;
  tuning: string; // id trong TUNINGS
  capo: number;
  bpm: number;
  timeSignature: string; // id trong TIME_SIGNATURES
  bars: number;
  grid: number; // 4 | 8 | 16
};

export const NEW_TAB_LIMITS = { capo: [0, 12], bpm: [30, 240], bars: [1, 64] } as const;

const clamp = (v: number, [lo, hi]: readonly [number, number]) => Math.min(hi, Math.max(lo, Math.round(v) || lo));

/** Số dấu lặng trong một ô theo lưới (vd. 4/4 + móc đơn → 8; 6/8 + móc kép → 12) */
export function restsPerBar(num: number, den: number, grid: number) {
  return Math.max(1, Math.round((num * grid) / den));
}

export function newTabTex(o: NewTabOptions): string {
  const tuning = TUNINGS.find((t) => t.id === o.tuning) ?? TUNINGS[0];
  const ts = TIME_SIGNATURES.find((t) => t.id === o.timeSignature) ?? TIME_SIGNATURES[0];
  const grid = GRIDS.some((g) => g.value === o.grid) ? o.grid : 8;
  // lưới thô hơn mẫu số (vd. nốt đen trong 6/8) → dùng mẫu số làm lưới
  const step = grid < ts.den ? ts.den : grid;
  const capo = clamp(o.capo, NEW_TAB_LIMITS.capo);
  const bars = clamp(o.bars, NEW_TAB_LIMITS.bars);
  const title = o.title.replace(/["\\]/g, "'").trim();
  const bar = Array.from({ length: restsPerBar(ts.num, ts.den, step) }, () => `r.${step}`).join(" ");
  return [
    title ? `\\title "${title}"` : "",
    `\\tempo ${clamp(o.bpm, NEW_TAB_LIMITS.bpm)}`,
    ".",
    `\\track "Guitar"`,
    `\\staff {score tabs}`,
    `\\instrument acousticguitarsteel`,
    `\\tuning ${tuning.notes}`,
    capo ? `\\capo ${capo}` : "",
    // khuông nhạc ghi theo thế bấm: guitar ghi cao hơn 1 quãng tám, trừ phần capo
    `\\displaytranspose ${12 - capo}`,
    `\\ts ${ts.num} ${ts.den}`,
    Array.from({ length: bars }, () => `${bar} |`).join("\n"),
  ]
    .filter(Boolean)
    .join("\n");
}
