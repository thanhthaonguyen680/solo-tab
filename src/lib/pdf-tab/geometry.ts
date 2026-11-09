// Trích dữ liệu hình học từ một trang PDF: chữ (kèm toạ độ), nét thẳng và hình được tô.
// Toạ độ theo hệ trang: gốc trên-trái, y tăng xuống dưới. Chạy được cả trình duyệt lẫn Node.
import type { PDFPageProxy } from "pdfjs-dist/legacy/build/pdf.mjs";

/** Bảng mã toán tử vẽ của pdf.js (`OPS`) — truyền vào để module không phải import pdf.js */
export type PdfOps = Record<string, number>;

export type TextItem = { str: string; x: number; y: number; w: number; h: number };
export type Segment = { x0: number; y0: number; x1: number; y1: number };
export type Fill = { x0: number; y0: number; x1: number; y1: number; n: number; op: number };
/**
 * Ký hiệu nhạc in bằng phông SMuFL (ký tự vùng riêng U+E000–U+F8FF) — Guitar Pro 8 in đầu nốt, đuôi móc,
 * dấu lặng… theo cách này thay vì vẽ hình. `x`, `y`: gốc ký tự (đường chân chữ); `size`: cỡ phông.
 */
export type MusicGlyph = { code: number; x: number; y: number; size: number; w: number };
export type PageGeometry = { width: number; height: number; texts: TextItem[]; segments: Segment[]; fills: Fill[]; glyphs: MusicGlyph[] };

const isMusicChar = (code: number | undefined) => code !== undefined && code >= 0xe000 && code <= 0xf8ff;
type PdfGlyph = { unicode?: string; width?: number; isSpace?: boolean };

type Matrix = [number, number, number, number, number, number];
const mul = (m: Matrix, n: Matrix): Matrix => [
  m[0] * n[0] + m[2] * n[1],
  m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3],
  m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4],
  m[1] * n[4] + m[3] * n[5] + m[5],
];
const apply = (m: Matrix, x: number, y: number): [number, number] => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];

export async function pageGeometry(page: PDFPageProxy, OPS: PdfOps): Promise<PageGeometry> {
  const vp = page.getViewport({ scale: 1 });
  const H = vp.height;
  const tc = await page.getTextContent();
  const texts: TextItem[] = [];
  for (const it of tc.items) {
    if (!("str" in it) || !it.str.trim()) continue;
    texts.push({ str: it.str, x: it.transform[4], y: H - it.transform[5], w: it.width, h: it.height });
  }

  const ops = await page.getOperatorList();
  let ctm: Matrix = [1, 0, 0, 1, 0, 0];
  const stack: Matrix[] = [];
  const segments: Segment[] = [];
  const fills: Fill[] = [];
  const glyphs: MusicGlyph[] = [];
  // Trạng thái chữ — theo đúng cách pdf.js đặt từng ký tự khi vẽ, để biết vị trí riêng của mỗi ký hiệu
  // (getTextContent gộp các ký tự cùng hàng thành một chuỗi nên mất vị trí từng cái)
  const text = { tm: null as Matrix | null, x: 0, y: 0, lineX: 0, lineY: 0, size: 0, fontScale: 0.001, charSp: 0, wordSp: 0, hScale: 1, leading: 0, rise: 0 };
  const moveText = (x: number, y: number) => {
    text.x = text.lineX += x;
    text.y = text.lineY += y;
  };
  for (let i = 0; i < ops.fnArray.length; i++) {
    const fn = ops.fnArray[i];
    const args = ops.argsArray[i] as unknown[];
    if (fn === OPS.save) stack.push(ctm);
    else if (fn === OPS.restore) ctm = stack.pop() ?? ctm;
    else if (fn === OPS.transform) ctm = mul(ctm, args as Matrix);
    else if (fn === OPS.beginText) Object.assign(text, { tm: null, x: 0, y: 0, lineX: 0, lineY: 0 });
    else if (fn === OPS.setTextMatrix) {
      const m = (args.length === 1 ? args[0] : args) as ArrayLike<number>;
      Object.assign(text, { tm: Array.from(m) as Matrix, x: 0, y: 0, lineX: 0, lineY: 0 });
    } else if (fn === OPS.moveText) moveText(args[0] as number, args[1] as number);
    else if (fn === OPS.setLeadingMoveText) {
      text.leading = args[1] as number;
      moveText(args[0] as number, args[1] as number);
    } else if (fn === OPS.setLeading) text.leading = -(args[0] as number);
    else if (fn === OPS.nextLine) moveText(0, text.leading);
    else if (fn === OPS.setFont) {
      text.size = Math.abs(args[1] as number);
      const name = args[0] as string;
      const font = page.commonObjs.has(name) ? (page.commonObjs.get(name) as { fontMatrix?: number[] }) : null;
      text.fontScale = font?.fontMatrix?.[0] || 0.001;
    } else if (fn === OPS.setCharSpacing) text.charSp = args[0] as number;
    else if (fn === OPS.setWordSpacing) text.wordSp = args[0] as number;
    else if (fn === OPS.setHScale) text.hScale = (args[0] as number) / 100;
    else if (fn === OPS.setTextRise) text.rise = args[0] as number;
    else if (fn === OPS.showText || fn === OPS.showSpacedText) {
      const m = text.tm ? mul(ctm, text.tm) : ctm;
      const scale = Math.hypot(m[0], m[1]);
      let x = 0;
      for (const g of args[0] as (number | PdfGlyph)[]) {
        if (typeof g === "number") {
          x -= (g * text.size) / 1000;
          continue;
        }
        const advance = (g.width ?? 0) * text.size * text.fontScale;
        const code = g.unicode?.codePointAt(0);
        if (isMusicChar(code)) {
          const [px, py] = apply(m, text.x + x * text.hScale, text.y + text.rise);
          glyphs.push({ code: code!, x: px, y: H - py, size: text.size * scale, w: advance * text.hScale * scale });
        }
        x += advance + (g.isSpace ? text.wordSp : 0) + text.charSp;
      }
      text.x += x * text.hScale;
    }
    else if (fn === OPS.constructPath) {
      const paintOp = args[0] as number;
      const data = (args[1] as ArrayLike<number>[])[0];
      if (!data) continue;
      const pts: [number, number][] = [];
      const segs: [[number, number], [number, number]][] = [];
      let cur: [number, number] | null = null;
      for (let k = 0; k < data.length; ) {
        const op = data[k];
        if (op === 0) {
          cur = apply(ctm, data[k + 1], data[k + 2]);
          pts.push(cur);
          k += 3;
        } else if (op === 1) {
          const p = apply(ctm, data[k + 1], data[k + 2]);
          if (cur) segs.push([cur, p]);
          cur = p;
          pts.push(p);
          k += 3;
        } else if (op === 2) {
          const p = apply(ctm, data[k + 5], data[k + 6]);
          pts.push(apply(ctm, data[k + 1], data[k + 2]), apply(ctm, data[k + 3], data[k + 4]), p);
          cur = p;
          k += 7;
        } else if (op === 3) {
          const p = apply(ctm, data[k + 3], data[k + 4]);
          pts.push(p);
          cur = p;
          k += 5;
        } else k += 1; // closePath
      }
      if (!pts.length) continue;
      if (paintOp === OPS.stroke || paintOp === OPS.closeStroke) {
        for (const [p, q] of segs) segments.push({ x0: p[0], y0: H - p[1], x1: q[0], y1: H - q[1] });
      } else {
        const xs = pts.map((p) => p[0]);
        const ys = pts.map((p) => H - p[1]);
        fills.push({ x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys), n: pts.length, op: paintOp });
      }
    }
  }
  return { width: vp.width, height: H, texts, segments, fills, glyphs };
}
