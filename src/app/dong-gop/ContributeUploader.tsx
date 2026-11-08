"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { buttonPrimary, buttonSecondary, inputClass } from "@/app/admin/ui";
import { TabPlayer } from "@/components/TabPlayer";
import { collections } from "@/config/site";
import { encodeScoreFile, isScoreFile, SCORE_FILE_EXTENSIONS } from "@/lib/notation-format";
import { readPdfTab, readScoreFile, type ScoreFile } from "@/lib/score-reader";
import { LEVELS } from "@/lib/song-model";
import { submitContribution } from "./actions";

type Ready = {
  fileName: string;
  title: string;
  artist: string;
  tempo: number | null;
  bars: number;
  /** File Guitar Pro: chọn track; PDF: tab đã đọc sẵn (alphaTex) */
  score: ScoreFile | null;
  track: number;
  pdfNotation: string | null;
  oddBars: number[];
};

type State = { step: "idle" } | { step: "reading"; fileName: string } | ({ step: "ready"; sending: boolean } & Ready);

/** Đẩy file PDF / Guitar Pro lên → đọc ngay trên trình duyệt thành phần nhạc phát được → nghe thử → gửi duyệt */
export function ContributeUploader() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<State>({ step: "idle" });
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();

  async function onPick(file: File | undefined) {
    setError(undefined);
    setNotice(undefined);
    if (!file) return;
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf && !isScoreFile(file.name)) {
      return setError(`Chọn file PDF hoặc file Guitar Pro / MusicXML (${SCORE_FILE_EXTENSIONS.join(", ")}).`);
    }
    setState({ step: "reading", fileName: file.name });
    try {
      if (isPdf) {
        const tab = await readPdfTab(file);
        if (tab.notation === null) throw new Error(tab.reason);
        setState({
          step: "ready",
          sending: false,
          fileName: file.name,
          title: tab.title ?? file.name.replace(/\.pdf$/i, ""),
          artist: "",
          tempo: tab.tempo,
          bars: tab.report.bars,
          score: null,
          track: 0,
          pdfNotation: tab.notation,
          oddBars: tab.report.oddBars,
        });
      } else {
        const score = await readScoreFile(file);
        const guitar = score.tracks.find((t) => t.notes > 0) ?? score.tracks[0];
        setState({
          step: "ready",
          sending: false,
          fileName: file.name,
          title: score.title,
          artist: score.artist,
          tempo: score.tempo,
          bars: score.bars,
          score,
          track: guitar.index,
          pdfNotation: null,
          oddBars: [],
        });
      }
    } catch (e) {
      setState({ step: "idle" });
      setError(e instanceof Error ? e.message : "Không đọc được file.");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const notation =
    state.step === "ready" ? (state.score ? encodeScoreFile(state.score.bytes, state.track) : state.pdfNotation!) : null;

  async function onSubmit(form: FormData) {
    if (state.step !== "ready" || !notation) return;
    setError(undefined);
    setState({ ...state, sending: true });
    const result = await submitContribution({
      title: String(form.get("title") ?? ""),
      artist: String(form.get("artist") ?? ""),
      collection: String(form.get("collection") ?? ""),
      level: String(form.get("level") ?? ""),
      notation,
      tempo: state.tempo,
      rights: form.get("rights") === "on",
    });
    if (!result.ok) {
      setState({ ...state, sending: false });
      return setError(result.error);
    }
    setState({ step: "idle" });
    setNotice(`✓ Đã gửi “${result.title}”. Bài sẽ hiện trên site sau khi admin duyệt.`);
    router.refresh();
  }

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-accent/40 bg-surface p-5" aria-label="Gửi bài">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Đẩy file lên</h2>
          <p className="text-sm text-muted">
            <b className="text-soft">File Guitar Pro</b> (.gp, .gp5, .gpx…) / MusicXML, hoặc <b className="text-soft">PDF xuất từ Guitar Pro</b>.
            Hệ thống tự dựng phần nhạc phát được — nghe thử rồi gửi.
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={["application/pdf", ".pdf", ...SCORE_FILE_EXTENSIONS].join(",")}
          className="sr-only"
          id="contribute-file"
          onChange={(e) => onPick(e.target.files?.[0])}
          disabled={state.step === "reading" || (state.step === "ready" && state.sending)}
        />
        <label htmlFor="contribute-file" className={`${state.step === "ready" ? buttonSecondary : buttonPrimary} cursor-pointer`}>
          {state.step === "ready" ? "Chọn file khác" : "Chọn file PDF / Guitar Pro"}
        </label>
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
      {state.step === "reading" && (
        <p role="status" className="text-sm font-semibold text-soft">
          Đang đọc “{state.fileName}”…
        </p>
      )}

      {state.step === "ready" && notation && (
        <>
          <p className="rounded-xl border border-accent/40 bg-fresh px-4 py-3 text-sm text-accent-ink">
            🎸 Đã dựng phần nhạc từ <b>{state.fileName}</b>: {state.bars} ô nhịp. Bấm phát để nghe thử.
            {state.oddBars.length > 0 && (
              <span className="mt-1 block text-soft">
                Có thể đọc chưa chuẩn ở ô {state.oddBars.slice(0, 8).join(", ")} — admin sẽ nghe và chỉnh khi duyệt.
              </span>
            )}
          </p>

          {state.score && state.score.tracks.length > 1 && (
            <label className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-semibold">Track hiển thị:</span>
              <select
                value={state.track}
                onChange={(e) => setState({ ...state, track: Number(e.target.value) })}
                className={`${inputClass} w-auto`}
              >
                {state.score.tracks.map((t) => (
                  <option key={t.index} value={t.index}>
                    {t.name} ({t.notes} nốt)
                  </option>
                ))}
              </select>
            </label>
          )}

          <TabPlayer key={`${state.fileName}:${state.track}`} notation={notation} />

          <form action={onSubmit} className="grid gap-4 rounded-xl border border-line bg-bg p-4 sm:grid-cols-2" aria-label="Thông tin bài">
            <Field label="Tên bài *" id="c-title" className="sm:col-span-2">
              <input id="c-title" name="title" required maxLength={200} defaultValue={state.title} className={inputClass} />
            </Field>
            <Field label="Ca sĩ / tác giả bài hát" id="c-artist">
              <input id="c-artist" name="artist" maxLength={200} defaultValue={state.artist} className={inputClass} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Kho" id="c-collection">
                <select id="c-collection" name="collection" defaultValue="melody" className={inputClass}>
                  {Object.values(collections).map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Độ khó" id="c-level">
                <select id="c-level" name="level" defaultValue="Vừa" className={inputClass}>
                  {LEVELS.map((l) => (
                    <option key={l}>{l}</option>
                  ))}
                </select>
              </Field>
            </div>
            <label className="flex items-start gap-3 rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm sm:col-span-2">
              <input type="checkbox" name="rights" required className="mt-0.5 size-5 shrink-0 accent-[var(--accent-ink)]" />
              <span>
                <b>Tôi tự soạn tab này</b> (hoặc được người soạn cho phép đăng). Tab có thể bị gỡ nếu chủ sở hữu bản quyền yêu cầu.
              </span>
            </label>
            <div className="flex flex-wrap gap-2 sm:col-span-2">
              <button type="submit" disabled={state.sending} className={buttonPrimary}>
                {state.sending ? "Đang gửi…" : "Gửi đóng góp"}
              </button>
              <button type="button" onClick={() => setState({ step: "idle" })} disabled={state.sending} className={buttonSecondary}>
                Huỷ
              </button>
            </div>
          </form>
        </>
      )}
    </section>
  );
}

function Field({ label, id, className = "", children }: { label: string; id: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="text-sm font-bold">
        {label}
      </label>
      {children}
    </div>
  );
}
