"use client";

import type { AlphaTabApi } from "@coderline/alphatab";
import { useEffect, useRef, useState } from "react";

const BPM_STEP = 4;
const BPM_MIN = 30;
const BPM_MAX = 240;

type Status =
  | { kind: "loading"; label: string }
  | { kind: "ready" }
  | { kind: "error"; message: string };

/**
 * Tab tương tác: alphaTab vẽ khuông nhạc + tab từ alphaTex và tự phát bằng soundfont.
 * Con trỏ chạy theo từng nốt, trang tự cuộn theo, chỉnh được tốc độ / lặp / máy đếm nhịp.
 */
export function TabPlayer({ notation }: { notation: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<AlphaTabApi | null>(null);
  const [status, setStatus] = useState<Status>({ kind: "loading", label: "Đang vẽ tab…" });
  const [playerReady, setPlayerReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState({ current: 0, end: 0 });
  /** Tempo gốc của bài (ghi trong dữ liệu nốt) và tempo người xem đang chọn */
  const [baseBpm, setBaseBpm] = useState<number | null>(null);
  const [bpm, setBpm] = useState<number | null>(null);
  const [loop, setLoop] = useState(false);
  const [metronome, setMetronome] = useState(false);
  const [countIn, setCountIn] = useState(false);
  /** iOS cũ (chưa có Audio Session API): phát kèm audio im lặng để tiếng không bị công tắc im lặng tắt */
  const needsSilentAudioRef = useRef(false);
  const silentAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let api: AlphaTabApi | null = null;
    let cancelled = false;

    // Phải đặt trước khi alphaTab tạo AudioContext
    needsSilentAudioRef.current = !preferPlaybackAudioSession() && isIOS();

    (async () => {
      const alphaTab = await import("@coderline/alphatab");
      if (cancelled) return;
      const css = getComputedStyle(document.documentElement);
      const color = (name: string) => css.getPropertyValue(name).trim();
      api = new alphaTab.AlphaTabApi(host, {
        core: {
          fontDirectory: "/alphatab/font/",
          scriptFile: "/alphatab/alphaTab.mjs",
        },
        display: {
          layoutMode: alphaTab.LayoutMode.Page,
          scale: 0.95,
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
          scrollOffsetY: -150, // chừa chỗ cho header + thanh điều khiển dính trên cùng
        },
      });
      apiRef.current = api;

      api.scoreLoaded.on((score) => {
        setBaseBpm(score.tempo);
        setBpm(score.tempo);
      });
      api.renderFinished.on(() => setStatus((s) => (s.kind === "loading" ? { kind: "loading", label: "Đang tải tiếng đàn…" } : s)));
      api.soundFontLoad.on((e) => {
        const pct = e.total ? Math.round((e.loaded / e.total) * 100) : 0;
        setStatus({ kind: "loading", label: `Đang tải tiếng đàn… ${pct}%` });
      });
      api.playerReady.on(() => {
        setPlayerReady(true);
        setStatus({ kind: "ready" });
      });
      api.playerStateChanged.on((e) => {
        const isPlaying = e.state === alphaTab.synth.PlayerState.Playing;
        setPlaying(isPlaying);
        if (!isPlaying) silentAudioRef.current?.pause();
      });
      api.playerPositionChanged.on((e) => setTime({ current: e.currentTime, end: e.endTime }));
      api.error.on((e) => {
        console.error("alphaTab:", e);
        setStatus({ kind: "error", message: "Không tải được tab tương tác." });
      });

      api.tex(notation);
    })().catch((e) => {
      console.error("alphaTab:", e);
      setStatus({ kind: "error", message: "Không tải được tab tương tác." });
    });

    return () => {
      cancelled = true;
      api?.destroy();
      apiRef.current = null;
      const silent = silentAudioRef.current;
      if (silent) {
        silent.pause();
        URL.revokeObjectURL(silent.src);
        silentAudioRef.current = null;
      }
    };
  }, [notation]);

  function togglePlay() {
    const api = apiRef.current;
    if (!api) return;
    // Gọi ngay trong sự kiện bấm (iOS chỉ cho phát âm thanh khi người dùng chạm)
    if (needsSilentAudioRef.current && !playing) {
      silentAudioRef.current ??= createSilentAudio();
      silentAudioRef.current.play().catch(() => {});
    }
    api.playPause();
  }

  function changeBpm(next: number) {
    if (!baseBpm) return;
    const v = Math.min(BPM_MAX, Math.max(BPM_MIN, next));
    setBpm(v);
    if (apiRef.current) apiRef.current.playbackSpeed = v / baseBpm;
  }
  function toggleLoop(v: boolean) {
    setLoop(v);
    if (apiRef.current) apiRef.current.isLooping = v;
  }
  function toggleMetronome(v: boolean) {
    setMetronome(v);
    if (apiRef.current) apiRef.current.metronomeVolume = v ? 1 : 0;
  }
  function toggleCountIn(v: boolean) {
    setCountIn(v);
    if (apiRef.current) apiRef.current.countInVolume = v ? 1 : 0;
  }

  return (
    <section className="flex flex-col gap-3" aria-label="Tab tương tác">
      <div className="sticky top-16 z-10 -mx-1 flex flex-wrap items-center gap-2 rounded-xl border border-line bg-surface/95 p-2 backdrop-blur-md">
        <button
          type="button"
          onClick={togglePlay}
          disabled={!playerReady}
          aria-label={playing ? "Tạm dừng" : "Phát"}
          className="glow grid size-11 place-items-center rounded-lg bg-accent text-accent-fg transition-colors hover:bg-accent-hover disabled:cursor-wait disabled:opacity-50 disabled:shadow-none"
        >
          {playing ? (
            <svg viewBox="0 0 16 16" className="size-4" aria-hidden>
              <path fill="currentColor" d="M3 2h3.5v12H3zM9.5 2H13v12H9.5z" />
            </svg>
          ) : (
            <svg viewBox="0 0 16 16" className="size-4" aria-hidden>
              <path fill="currentColor" d="M4 2.2v11.6c0 .6.6.9 1.1.6l9-5.8a.7.7 0 0 0 0-1.2l-9-5.8C4.6 1.3 4 1.6 4 2.2Z" />
            </svg>
          )}
        </button>
        <button
          type="button"
          onClick={() => apiRef.current?.stop()}
          disabled={!playerReady}
          aria-label="Về đầu bài"
          className="grid size-11 place-items-center rounded-lg border border-border text-soft transition-colors hover:border-muted hover:text-text disabled:opacity-50"
        >
          <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden>
            <path fill="currentColor" d="M3 3h10v10H3z" />
          </svg>
        </button>

        <span className="min-w-[88px] font-mono text-xs text-muted tabular-nums">
          {formatTime(time.current)} / {formatTime(time.end)}
        </span>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div role="group" aria-label="Tempo" className="flex h-9 items-stretch overflow-hidden rounded-lg border border-border">
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
              onClick={() => baseBpm && changeBpm(baseBpm)}
              disabled={!bpm}
              title={baseBpm ? `Bấm để về tempo gốc (${baseBpm} bpm)` : undefined}
              className={`min-w-[76px] border-x border-border px-2 font-mono text-xs tabular-nums transition-colors hover:bg-surface-2 ${
                bpm && baseBpm && bpm !== baseBpm ? "text-accent-ink" : "text-soft"
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
          <Toggle on={loop} onClick={() => toggleLoop(!loop)}>
            Lặp lại
          </Toggle>
          <Toggle on={metronome} onClick={() => toggleMetronome(!metronome)}>
            Đếm nhịp
          </Toggle>
          <Toggle on={countIn} onClick={() => toggleCountIn(!countIn)}>
            Đếm vào
          </Toggle>
        </div>
      </div>

      {status.kind !== "ready" && (
        <p
          role={status.kind === "error" ? "alert" : "status"}
          className={`text-sm ${status.kind === "error" ? "text-red-400" : "text-muted"}`}
        >
          {status.kind === "error" ? status.message : status.label}
        </p>
      )}

      <div className="tab-player overflow-hidden rounded-xl border border-line bg-surface p-2 sm:p-4">
        <div ref={hostRef} />
      </div>
      <p className="text-xs text-muted">Bấm vào một nốt bất kỳ để phát từ chỗ đó.</p>
    </section>
  );
}

function Toggle({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`h-9 rounded-lg border px-2.5 text-xs font-semibold sm:px-3 transition-colors ${
        on ? "border-accent bg-accent text-accent-fg" : "border-border text-soft hover:border-muted hover:text-text"
      }`}
    >
      {children}
    </button>
  );
}

function formatTime(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/**
 * Safari trên iPhone mặc định coi Web Audio là "âm thanh nền": bật công tắc im lặng là tắt tiếng,
 * dù nhạc vẫn chạy. Khai báo phiên "playback" (như app nghe nhạc) để luôn phát ra tiếng.
 * Trả về false nếu trình duyệt chưa hỗ trợ Audio Session API (iOS < 16.4).
 */
function preferPlaybackAudioSession() {
  const nav = navigator as Navigator & { audioSession?: { type: string } };
  if (!nav.audioSession) return false;
  try {
    nav.audioSession.type = "playback";
  } catch {
    return false;
  }
  return true;
}

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent));
}

/** 0,5 giây im lặng (WAV 8 kHz, mono, 8-bit), phát lặp để Safari chuyển sang chế độ phát nhạc */
function createSilentAudio() {
  const samples = 4000;
  const buf = new ArrayBuffer(44 + samples);
  const v = new DataView(buf);
  const str = (o: number, t: string) => [...t].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, "RIFF");
  v.setUint32(4, 36 + samples, true);
  str(8, "WAVE");
  str(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, 8000, true);
  v.setUint32(28, 8000, true);
  v.setUint16(32, 1, true);
  v.setUint16(34, 8, true);
  str(36, "data");
  v.setUint32(40, samples, true);
  new Uint8Array(buf, 44).fill(128);
  const audio = new Audio(URL.createObjectURL(new Blob([buf], { type: "audio/wav" })));
  audio.loop = true;
  audio.setAttribute("playsinline", "");
  return audio;
}
