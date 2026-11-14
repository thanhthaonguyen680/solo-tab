import type { ParsedTab } from "./parse.ts";

/** Tóm tắt kết quả đọc để hiển thị cho admin */
export type TabReport = { bars: number; notes: number; oddBars: number[]; warnings: number };

export function reportOf(tab: ParsedTab): TabReport {
  return {
    bars: tab.bars.length,
    notes: tab.bars.reduce((s, b) => s + b.beats.reduce((t, beat) => t + beat.notes.length, 0), 0),
    // Ô có độ dài lạ (không phải số phách nguyên) — dễ là đọc sai trường độ
    oddBars: tab.bars.flatMap((b, i) => (Number.isInteger(Math.round(b.length * 1000) / 1000) ? [] : [i + 1])),
    warnings: tab.bars.reduce((s, b) => s + b.warnings.length, 0),
  };
}

/** Dấu lặng bù cho đủ ô: [số phách đen, trường độ] */
const REST_VALUES: [number, number][] = [[4, 1], [2, 2], [1, 4], [0.5, 8], [0.25, 16], [0.125, 32]];

/**
 * Chuyển kết quả đọc PDF sang alphaTex cho trình phát tab.
 * Mặc định để dây ngân (let ring) — kiểu chơi chuẩn của tab fingerstyle.
 */
export function toAlphaTex(tab: ParsedTab, { letRing = true } = {}): string {
  const esc = (s: string) => s.replace(/["\\]/g, "'");
  const nylon = tab.instrumentLabel ? /^[NC]-/.test(tab.instrumentLabel) : false;
  const lines: string[] = [];
  if (tab.title) lines.push(`\\title "${esc(tab.title)}"`);
  lines.push(
    `\\tempo ${tab.tempo ?? 90}`,
    ".",
    `\\track "Guitar"`,
    `\\staff {score tabs}`,
    `\\instrument ${nylon ? "acousticguitarnylon" : "acousticguitarsteel"}`,
  );
  if (tab.capo) lines.push(`\\capo ${tab.capo}`);
  // Khuông nhạc ghi theo thế bấm như sheet gốc: guitar ghi cao hơn 1 quãng tám, trừ phần capo
  lines.push(`\\displaytranspose ${12 - tab.capo}`);

  let ts = "4 4";
  // Dây đang có nốt vuốt legato tới (nốt đích không được gảy lại). Vuốt tiếp từ nốt đích đó thì alphaTab
  // uốn trên một nốt không kêu → nốt cuối chuỗi bị mất. Nên trong chuỗi 7→8→10: vuốt đầu legato,
  // các vuốt sau là vuốt gảy (shift) — nghe gần Guitar Pro nhất mà vẫn đủ mọi nốt.
  const legatoInto = new Set<number>();
  for (const bar of tab.bars) {
    const parts: string[] = [];
    // Chỉ dấu nhịp in trên sheet (PDF Guitar Pro 8): ô ngắn hơn thì bù dấu lặng cho đủ; ô dài hơn (đọc sai
    // trường độ) thì vẫn mở rộng ô để không nốt nào bị chồng lên ô sau
    const sigBeats = bar.timeSig ? (bar.timeSig[0] * 4) / bar.timeSig[1] : null;
    let sig: string;
    let pad = 0;
    if (sigBeats && bar.length <= sigBeats + 0.01) {
      sig = `${bar.timeSig![0]} ${bar.timeSig![1]}`;
      pad = sigBeats - bar.length;
    } else {
      // Không biết chỉ dấu nhịp: ô ngắn / dài hơn 4 phách (vd. ô đệm trước đoạn mới) → đổi số chỉ nhịp cho riêng ô đó
      const beats = Math.round(bar.length * 4) / 4;
      sig = `${Number.isInteger(beats) && beats >= 1 && beats <= 7 ? beats : 4} 4`;
    }
    if (sig !== ts) {
      parts.push(`\\ts ${sig}`);
      ts = sig;
    }
    for (const b of bar.beats) {
      const fx: string[] = [];
      if (b.dots) fx.push("d");
      if (b.grace) fx.push("gr"); // nốt hoa mỹ: không chiếm phách, ăn bớt thời gian của nốt trước
      if (b.chord) fx.push(`ch "${esc(b.chord)}"`);
      if (b.arpeggio) fx.push("au");
      let body = "r";
      if (!b.rest && b.notes.length) {
        const notes = b.notes.map((n) => {
          const nfx: string[] = [];
          if (letRing && !n.dead) nfx.push("lr");
          if (n.harmonic) nfx.push("nh");
          if (n.slide) {
            nfx.push(legatoInto.has(n.string) ? "ss" : "sl");
            if (legatoInto.has(n.string)) legatoInto.delete(n.string);
            else legatoInto.add(n.string);
          } else if (!b.grace) legatoInto.delete(n.string);
          const fret = n.tie ? "-" : n.dead ? "x" : String(n.fret);
          return `${fret}.${n.string}${nfx.length ? `{${nfx.join(" ")}}` : ""}`;
        });
        body = notes.length > 1 ? `(${notes.join(" ")})` : notes[0];
      }
      parts.push(`${body}.${b.dur}${fx.length ? `{${fx.join(" ")}}` : ""}`);
    }
    for (const [value, dur] of REST_VALUES) {
      while (pad >= value - 1e-6) {
        parts.push(`r.${dur}`);
        pad -= value;
      }
    }
    lines.push(`${parts.join(" ")} |`);
  }
  return lines.join("\n");
}
