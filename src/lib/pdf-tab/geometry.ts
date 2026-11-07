// Trích dữ liệu hình học từ một trang PDF: chữ (kèm toạ độ), nét thẳng và hình được tô.
// Toạ độ theo hệ trang: gốc trên-trái, y tăng xuống dưới. Chạy được cả trình duyệt lẫn Node.
import type { PDFPageProxy } from "pdfjs-dist/legacy/build/pdf.mjs";

/** Bảng mã toán tử vẽ của pdf.js (`OPS`) — truyền vào để module không phải import pdf.js */
export type PdfOps = Record<string, number>;

export type TextItem = { str: string; x: number; y: number; w: number; h: number };
export type Segment = { x0: number; y0: number; x1: number; y1: number };
export type Fill = { x0: number; y0: number; x1: number; y1: number; n: number; op: number };
export type PageGeometry = { width: number; height: number; texts: TextItem[]; segments: Segment[]; fills: Fill[] };

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
  for (let i = 0; i < ops.fnArray.length; i++) {
    const fn = ops.fnArray[i];
    const args = ops.argsArray[i] as unknown[];
    if (fn === OPS.save) stack.push(ctm);
    else if (fn === OPS.restore) ctm = stack.pop() ?? ctm;
    else if (fn === OPS.transform) ctm = mul(ctm, args as Matrix);
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
  return { width: vp.width, height: H, texts, segments, fills };
}
