/**
 * Đọc file tab trong trình duyệt (không gửi file lên server):
 * - Guitar Pro / MusicXML: đọc bằng alphaTab;
 * - PDF xuất từ Guitar Pro: đọc số trên tab + ký hiệu trường độ để dựng tab tương tác (alphaTex).
 * Dùng chung cho trang admin và trang đóng góp của thành viên.
 */
import type { TabReport } from "./pdf-tab/alphatex";
import type { PdfOps } from "./pdf-tab/geometry";
import { SCORE_FILE_MAX_BYTES } from "./notation-format";

/** File Guitar Pro / MusicXML đã đọc thử bằng alphaTab */
export type ScoreFile = {
  fileName: string;
  bytes: Uint8Array;
  title: string;
  artist: string;
  tempo: number;
  bars: number;
  tracks: { index: number; name: string; notes: number }[];
};

/** Kết quả đọc tab tự động từ PDF (chỉ được với PDF xuất từ Guitar Pro) */
export type TabResult = { notation: string; report: TabReport; title: string | null; tempo: number | null } | { notation: null; reason: string };

export type PdfDoc = Parameters<typeof import("./pdf-tab/parse").parseGuitarProPdf>[0];

export async function readScoreFile(file: File): Promise<ScoreFile> {
  if (file.size > SCORE_FILE_MAX_BYTES) throw new Error(`File quá lớn (tối đa ${SCORE_FILE_MAX_BYTES / 1024} KB).`);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const alphaTab = await import("@coderline/alphatab");
  let score;
  try {
    score = alphaTab.importer.ScoreLoader.loadScoreFromBytes(bytes);
  } catch (e) {
    console.error("alphaTab:", e);
    throw new Error("Không đọc được file tab (file hỏng hoặc định dạng chưa hỗ trợ).");
  }
  const tracks = score.tracks
    .filter((t) => !t.isPercussion)
    .map((t) => ({
      index: t.index,
      name: t.name || `Track ${t.index + 1}`,
      notes: t.staves.reduce((n, st) => n + st.bars.reduce((m, b) => m + b.voices.reduce((k, v) => k + v.beats.reduce((j, beat) => j + beat.notes.length, 0), 0), 0), 0),
    }));
  if (!tracks.length) throw new Error("File không có track nhạc cụ nào để hiển thị.");
  return {
    fileName: file.name,
    bytes,
    title: score.title || file.name.replace(/\.[^.]+$/, ""),
    artist: score.artist || "",
    tempo: score.tempo,
    bars: score.masterBars.length,
    tracks,
  };
}

/** Mở PDF bằng pdf.js (bản legacy có polyfill — bản thường cần trình duyệt rất mới) */
export async function openPdf(file: File) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/legacy/build/pdf.worker.min.mjs", import.meta.url).toString();
  const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
  const doc = await task.promise.catch((e: unknown) => {
    console.error("pdf.js:", e instanceof Error ? `${e.name}: ${e.message}` : String(e));
    throw new Error("Không đọc được file PDF (file hỏng hoặc có mật khẩu)");
  });
  return { doc, task, OPS: pdfjs.OPS as unknown as PdfOps };
}

export async function readTab(doc: PdfDoc, OPS: PdfOps): Promise<TabResult> {
  try {
    const [{ parseGuitarProPdf }, { reportOf, toAlphaTex }] = await Promise.all([
      import("./pdf-tab/parse"),
      import("./pdf-tab/alphatex"),
    ]);
    const parsed = await parseGuitarProPdf(doc, OPS);
    const report = reportOf(parsed);
    if (!report.bars || !report.notes) {
      return { notation: null, reason: "Không tìm thấy số trên khuông tab — hiện chỉ đọc được PDF xuất từ Guitar Pro." };
    }
    return { notation: toAlphaTex(parsed), report, title: parsed.title, tempo: parsed.tempo };
  } catch (e) {
    console.error("Đọc tab từ PDF:", e);
    return { notation: null, reason: "PDF này có cấu trúc lạ nên chưa đọc được." };
  }
}

/** Chỉ đọc tab từ PDF (không chuyển trang thành ảnh) — cho trang đóng góp */
export async function readPdfTab(file: File, maxBytes = 40 * 1024 * 1024): Promise<TabResult> {
  if (file.size > maxBytes) throw new Error("File PDF quá lớn (tối đa 40 MB).");
  const { doc, task, OPS } = await openPdf(file);
  try {
    return await readTab(doc, OPS);
  } finally {
    await task.destroy();
  }
}
