"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { SHEET_LIMITS, type Sheet } from "@/lib/song-model";
import { commitSheet, removeSheet } from "../../actions";
import { buttonPrimary, buttonSecondary } from "../../ui";

/** Chiều rộng ảnh mỗi trang — đủ nét khi phóng to trên màn hình lớn */
const TARGET_WIDTH = 1600;
const MAX_PDF_BYTES = 40 * 1024 * 1024;

type RenderedPage = { blob: Blob; url: string; width: number; height: number };

type State =
  | { step: "idle" }
  | { step: "rendering"; done: number; total: number }
  | { step: "ready"; fileName: string; pages: RenderedPage[] }
  | { step: "uploading"; done: number; total: number; pages: RenderedPage[] };

export function SheetUploader({ slug, sheet }: { slug: string; sheet?: Sheet }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<State>({ step: "idle" });
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();

  // Giải phóng URL xem trước khi bỏ các trang đã render
  const previews = state.step === "ready" || state.step === "uploading" ? state.pages : null;
  useEffect(() => () => previews?.forEach((p) => URL.revokeObjectURL(p.url)), [previews]);

  async function onPick(file: File | undefined) {
    setError(undefined);
    setNotice(undefined);
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      return setError("Hãy chọn file PDF.");
    }
    if (file.size > MAX_PDF_BYTES) return setError("File PDF quá lớn (tối đa 40 MB).");

    try {
      const pages = await renderPdf(file, (done, total) => setState({ step: "rendering", done, total }));
      setState({ step: "ready", fileName: file.name, pages });
    } catch (e) {
      setState({ step: "idle" });
      setError(e instanceof Error ? e.message : "Không đọc được file PDF.");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function onUpload(pages: RenderedPage[]) {
    setError(undefined);
    const version = crypto.randomUUID();
    try {
      for (let i = 0; i < pages.length; i++) {
        setState({ step: "uploading", done: i, total: pages.length, pages });
        const body = new FormData();
        body.set("version", version);
        body.set("page", String(i + 1));
        body.set("width", String(pages[i].width));
        body.set("height", String(pages[i].height));
        body.set("file", pages[i].blob, `trang-${i + 1}`);
        const res = await fetch(`/api/admin/sheet/${encodeURIComponent(slug)}`, { method: "POST", body });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? `Tải trang ${i + 1} thất bại (${res.status})`);
        }
      }
      const result = await commitSheet(slug, version, pages.length);
      if (!result.ok) throw new Error(result.error);
      setState({ step: "idle" });
      setNotice(`✓ Đã lưu sheet ${pages.length} trang.`);
      router.refresh();
    } catch (e) {
      // Giữ lại các trang đã render để bấm lưu lại; sheet cũ (nếu có) vẫn nguyên
      setState({ step: "ready", fileName: "", pages });
      setError(`${e instanceof Error ? e.message : "Lỗi khi tải lên"}. Sheet cũ vẫn giữ nguyên — bấm lưu để thử lại.`);
    }
  }

  async function onRemove() {
    if (!confirm("Xoá sheet PDF của bài này?")) return;
    const result = await removeSheet(slug);
    if (result.ok) {
      setNotice("✓ Đã xoá sheet.");
      router.refresh();
    } else setError(result.error);
  }

  const busy = state.step === "rendering" || state.step === "uploading";

  return (
    <section id="sheet" className="flex scroll-mt-24 flex-col gap-4 rounded-2xl border border-border bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Sheet PDF</h2>
          <p className="text-sm text-muted">
            Mỗi trang PDF được chuyển thành ảnh ngay trên máy bạn rồi mới tải lên. Tối đa {SHEET_LIMITS.maxPages} trang.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <label className={`${buttonPrimary} cursor-pointer ${busy ? "pointer-events-none opacity-60" : ""}`}>
            {sheet ? "Thay sheet PDF" : "Chọn file PDF"}
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf,.pdf"
              className="sr-only"
              disabled={busy}
              onChange={(e) => onPick(e.target.files?.[0])}
            />
          </label>
          {sheet && state.step === "idle" && (
            <button type="button" onClick={onRemove} className="rounded-lg border border-red-500/40 bg-bg px-4 py-2.5 text-sm font-semibold text-red-400 transition-colors hover:border-red-500">
              Xoá sheet
            </button>
          )}
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-xl border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-300">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="rounded-xl border border-accent/40 bg-fresh px-4 py-3 text-sm font-semibold text-accent-ink">
          {notice}
        </p>
      )}

      {state.step === "rendering" && <Progress label="Đang đọc PDF" done={state.done} total={state.total} />}
      {state.step === "uploading" && <Progress label="Đang tải lên" done={state.done} total={state.total} />}

      {state.step === "ready" && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl bg-accent/10 px-4 py-3">
          <p className="mr-auto text-sm font-semibold">
            Xem trước {state.pages.length} trang{state.fileName && ` từ “${state.fileName}”`} — kiểm tra rồi bấm lưu.
          </p>
          <button type="button" onClick={() => onUpload(state.pages)} className={buttonPrimary}>
            Lưu sheet ({state.pages.length} trang)
          </button>
          <button type="button" onClick={() => setState({ step: "idle" })} className={buttonSecondary}>
            Huỷ
          </button>
        </div>
      )}

      {previews ? (
        <PageGrid urls={previews.map((p) => p.url)} />
      ) : sheet ? (
        <PageGrid urls={sheet.pages.map((_, i) => `/api/sheet/${slug}/${sheet.version}/${i + 1}`)} />
      ) : (
        state.step === "idle" && (
          <p className="rounded-xl border border-dashed border-border p-8 text-center text-muted">
            Bài này chưa có sheet PDF.
          </p>
        )
      )}
    </section>
  );
}

function Progress({ label, done, total }: { label: string; done: number; total: number }) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <div className="flex flex-col gap-1.5" role="status">
      <p className="text-sm font-semibold">
        {label}… trang {Math.min(done + 1, total)}/{total}
      </p>
      <div className="h-3 overflow-hidden rounded-full border border-border bg-surface-2">
        <div className="h-full bg-accent transition-[width]" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function PageGrid({ urls }: { urls: string[] }) {
  return (
    <ol className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {urls.map((url, i) => (
        <li key={url} className="flex flex-col gap-1">
          <a href={url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg border border-border bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element -- ảnh blob / route có kiểm tra quyền, không qua tối ưu ảnh */}
            <img src={url} alt={`Trang ${i + 1}`} className="aspect-[1/1.414] w-full object-cover object-top" />
          </a>
          <span className="text-center font-mono text-xs text-muted">Trang {i + 1}</span>
        </li>
      ))}
    </ol>
  );
}

/** Đọc PDF bằng pdf.js và vẽ từng trang ra ảnh (WebP, hoặc JPEG nếu trình duyệt không hỗ trợ). */
async function renderPdf(file: File, onProgress: (done: number, total: number) => void): Promise<RenderedPage[]> {
  // Bản "legacy" có polyfill — bản thường cần trình duyệt rất mới (vd. Uint8Array#toHex, Chrome 140+)
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();

  const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
  try {
    const doc = await task.promise.catch((e: unknown) => {
      console.error("pdf.js:", e instanceof Error ? `${e.name}: ${e.message}` : String(e));
      throw new Error("Không đọc được file PDF (file hỏng hoặc có mật khẩu)");
    });
    if (doc.numPages > SHEET_LIMITS.maxPages) {
      throw new Error(`PDF có ${doc.numPages} trang — tối đa ${SHEET_LIMITS.maxPages} trang.`);
    }
    const pages: RenderedPage[] = [];
    for (let n = 1; n <= doc.numPages; n++) {
      onProgress(n - 1, doc.numPages);
      const page = await doc.getPage(n);
      const base = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: Math.min(TARGET_WIDTH / base.width, 4) });

      const canvas = document.createElement("canvas");
      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#fff"; // PDF có nền trong suốt
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvas, viewport }).promise;

      let blob = await toBlob(canvas, "image/webp", 0.85);
      if (blob?.type !== "image/webp") blob = await toBlob(canvas, "image/jpeg", 0.88);
      if (!blob) throw new Error(`Không chuyển được trang ${n} thành ảnh`);
      if (blob.size > SHEET_LIMITS.maxPageBytes) throw new Error(`Trang ${n} quá lớn sau khi chuyển thành ảnh`);

      pages.push({ blob, url: URL.createObjectURL(blob), width: canvas.width, height: canvas.height });
      page.cleanup();
    }
    onProgress(doc.numPages, doc.numPages);
    return pages;
  } finally {
    await task.destroy();
  }
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
}
