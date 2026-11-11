"use client";

import { useRef, useState } from "react";
import { buttonPrimary, buttonSecondary, inputClass } from "@/app/admin/ui";
import { TabPlayer } from "@/components/TabPlayer";
import { encodeScoreFile, isScoreFile, SCORE_FILE_EXTENSIONS } from "@/lib/notation-format";
import { readPdfTab, readScoreFile, type ScoreFile } from "@/lib/score-reader";
import { ContributionForm } from "./ContributionForm";

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

type State = { step: "idle" } | { step: "reading"; fileName: string } | ({ step: "ready" } & Ready);

/** Đẩy file PDF / Guitar Pro lên → đọc ngay trên trình duyệt thành phần nhạc phát được → nghe thử → gửi duyệt */
export function ContributeUploader() {
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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Tải file lên</h2>
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
          disabled={state.step === "reading"}
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

          <ContributionForm
            key={state.fileName}
            notation={notation}
            tempo={state.tempo}
            defaultTitle={state.title}
            defaultArtist={state.artist}
            onCancel={() => setState({ step: "idle" })}
            onSent={(title) => {
              setState({ step: "idle" });
              setNotice(`✓ Đã gửi “${title}”. Bài sẽ hiện trên site sau khi admin duyệt.`);
            }}
          />
        </>
      )}
    </div>
  );
}
