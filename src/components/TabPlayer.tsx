"use client";

import type { AlphaTabApi } from "@coderline/alphatab";
import { useEffect, useRef, useState } from "react";
import { decodeNotation } from "@/lib/notation-format";

const BPM_STEP = 4;
const BPM_MIN = 30;
const BPM_MAX = 240;

type Status =
  | { kind: "loading"; label: string }
  | { kind: "ready" }
  | { kind: "error"; message: string };

/**
 * Tab tương tác: alphaTab vẽ khuông nhạc + tab (từ alphaTex hoặc file Guitar Pro / MusicXML gốc)
 * và tự phát bằng soundfont. Con trỏ chạy theo từng nốt, trang tự cuộn theo,
 * chỉnh được tempo / lặp / máy đếm nhịp. `defaultBpm`: ô Tempo trong admin — tempo khi mở bài.
 */
export function TabPlayer({ notation, defaultBpm }: { notation: string; defaultBpm?: number }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<AlphaTabApi | null>(null);
  /**
   * Kiểu hiển thị. "auto": điện thoại dùng cuộn ngang (bản nhạc trôi mượt dưới con trỏ, trang không giật),
   * màn hình lớn dùng kiểu trang. Người xem bấm nút để đổi.
   */
  const [layoutChoice, setLayoutChoice] = useState<"auto" | "page" | "horizontal">("auto");
  const [horizontal, setHorizontal] = useState(false);
  /** Lựa chọn của người xem — giữ lại khi trình phát được tạo lại (đổi kiểu hiển thị) */
  const prefsRef = useRef<{ bpm: number | null; loop: boolean; metronome: boolean; countIn: boolean }>({
    bpm: null,
    loop: false,
    metronome: false,
    countIn: false,
  });
  const [status, setStatus] = useState<Status>({ kind: "loading", label: "Đang vẽ tab…" });
  const [playerReady, setPlayerReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState({ current: 0, end: 0 });
  /** Tempo ghi trong dữ liệu nốt, tempo mặc định khi mở bài, và tempo người xem đang chọn */
  const [baseBpm, setBaseBpm] = useState<number | null>(null);
  const [startBpm, setStartBpm] = useState<number | null>(null);
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
      const isHorizontal =
        layoutChoice === "horizontal" || (layoutChoice === "auto" && window.matchMedia("(max-width: 640px)").matches);
      setHorizontal(isHorizontal);
      setPlayerReady(false);
      setPlaying(false);
      setStatus({ kind: "loading", label: "Đang vẽ tab…" });
      const scroller = scrollRef.current;
      const css = getComputedStyle(document.documentElement);
      const color = (name: string) => css.getPropertyValue(name).trim();
      api = new alphaTab.AlphaTabApi(host, {
        core: {
          fontDirectory: "/alphatab/font/",
          scriptFile: "/alphatab/alphaTab.mjs",
        },
        display: {
          layoutMode: isHorizontal ? alphaTab.LayoutMode.Horizontal : alphaTab.LayoutMode.Page,
          scale: isHorizontal ? 0.85 : 0.95,
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
          ...(isHorizontal && scroller
            ? {
                // Cuộn ngang liên tục và mượt trong khung tab; con trỏ đứng cách mép trái ~1/4 khung
                scrollMode: alphaTab.ScrollMode.Smooth,
                scrollElement: scroller,
                scrollOffsetX: -Math.round(scroller.clientWidth * 0.25),
              }
            : {
                scrollMode: alphaTab.ScrollMode.Continuous,
                scrollOffsetY: -150, // chừa chỗ cho header + thanh điều khiển dính trên cùng
              }),
        },
      });
      apiRef.current = api;

      api.scoreLoaded.on((score) => {
        const start = defaultBpm ?? score.tempo;
        const current = prefsRef.current.bpm ?? start;
        setBaseBpm(score.tempo);
        setStartBpm(start);
        setBpm(current);
        if (api) {
          api.playbackSpeed = current / score.tempo;
          api.isLooping = prefsRef.current.loop;
          api.metronomeVolume = prefsRef.current.metronome ? 1 : 0;
          api.countInVolume = prefsRef.current.countIn ? 1 : 0;
        }
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

      const data = decodeNotation(notation);
      if (data.kind === "file") api.load(data.bytes, [data.track]);
      else api.tex(data.tex);
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
  }, [notation, defaultBpm, layoutChoice]);

  function togglePlay() {
    const api = apiRef.current;
    if (!api) return;
    // Gọi ngay trong sự kiện bấm (iOS chỉ cho phát âm thanh khi người dùng chạm)
    if (needsSilentAudioRef.current && !playing) {
      silentAudioRef.current ??= createSilentAudio();
      silentAudioRef.current.play().catch(() => {});
    }
    // Cuộn ngang: trang đứng yên khi phát, nên đưa khung tab vào tầm nhìn một lần lúc bắt đầu
    const scroller = scrollRef.current;
    const controls = controlsRef.current;
    if (horizontal && !playing && scroller && controls) {
      const top = 64 + controls.offsetHeight + 8; // header (64px) + thanh điều khiển dính
      const rect = scroller.getBoundingClientRect();
      if (rect.top < top || rect.bottom > window.innerHeight) {
        window.scrollBy({ top: rect.top - top, behavior: "smooth" });
      }
    }
    api.playPause();
  }

  function changeBpm(next: number) {
    if (!baseBpm) return;
    const v = Math.min(BPM_MAX, Math.max(BPM_MIN, next));
    setBpm(v);
    prefsRef.current.bpm = v;
    if (apiRef.current) apiRef.current.playbackSpeed = v / baseBpm;
  }
  function toggleLoop(v: boolean) {
    setLoop(v);
    prefsRef.current.loop = v;
    if (apiRef.current) apiRef.current.isLooping = v;
  }
  function toggleMetronome(v: boolean) {
    setMetronome(v);
    prefsRef.current.metronome = v;
    if (apiRef.current) apiRef.current.metronomeVolume = v ? 1 : 0;
  }
  function toggleCountIn(v: boolean) {
    setCountIn(v);
    prefsRef.current.countIn = v;
    if (apiRef.current) apiRef.current.countInVolume = v ? 1 : 0;
  }

  return (
    <section className="flex flex-col gap-3" aria-label="Tab tương tác">
      <div
        ref={controlsRef}
        className="sticky top-16 z-10 -mx-1 flex flex-wrap items-center gap-2 rounded-xl border border-line bg-surface/95 p-2 backdrop-blur-md"
      >
        <button
          type="button"
          onClick={togglePlay}
          disabled={!playerReady}
          aria-label={playing ? "Tạm dừng" : "Phát"}
          className="glow grid size-10 place-items-center rounded-lg sm:size-11 bg-accent text-accent-fg transition-colors hover:bg-accent-hover disabled:cursor-wait disabled:opacity-50 disabled:shadow-none"
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
          className="grid size-10 place-items-center rounded-lg sm:size-11 border border-border text-soft transition-colors hover:border-muted hover:text-text disabled:opacity-50"
        >
          <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden>
            <path fill="currentColor" d="M3 3h10v10H3z" />
          </svg>
        </button>

        <span className="font-mono text-xs text-muted tabular-nums sm:min-w-[88px]">
          {formatTime(time.current)} / {formatTime(time.end)}
        </span>

        <div className="ml-auto flex items-center">
          <div role="group" aria-label="Tempo" className="flex h-9 items-stretch overflow-hidden rounded-lg border border-border">
            <button
              type="button"
              onClick={() => bpm && changeBpm(bpm - BPM_STEP)}
              disabled={!bpm || bpm <= BPM_MIN}
              aria-label="Giảm tempo"
              className="w-8 text-lg leading-none text-soft sm:w-9 transition-colors hover:bg-surface-2 hover:text-text disabled:opacity-40"
            >
              −
            </button>
            <button
              type="button"
              onClick={() => startBpm && changeBpm(startBpm)}
              disabled={!bpm}
              title={startBpm ? `Bấm để về tempo mặc định (${startBpm} bpm)` : undefined}
              className={`min-w-[64px] border-x border-border px-1.5 font-mono sm:min-w-[76px] sm:px-2 text-xs tabular-nums transition-colors hover:bg-surface-2 ${
                bpm && startBpm && bpm !== startBpm ? "text-accent-ink" : "text-soft"
              }`}
            >
              {bpm ?? "—"} bpm
            </button>
            <button
              type="button"
              onClick={() => bpm && changeBpm(bpm + BPM_STEP)}
              disabled={!bpm || bpm >= BPM_MAX}
              aria-label="Tăng tempo"
              className="w-8 text-lg leading-none text-soft sm:w-9 transition-colors hover:bg-surface-2 hover:text-text disabled:opacity-40"
            >
              +
            </button>
          </div>
        </div>
        {/* Điện thoại: các nút bật/tắt nằm một hàng, kéo ngang được nếu chật */}
        <div className="flex w-full gap-2 overflow-x-auto sm:w-auto">
          <Toggle on={loop} onClick={() => toggleLoop(!loop)}>
            Lặp lại
          </Toggle>
          <Toggle on={metronome} onClick={() => toggleMetronome(!metronome)}>
            Đếm nhịp
          </Toggle>
          <Toggle on={countIn} onClick={() => toggleCountIn(!countIn)}>
            Đếm vào
          </Toggle>
          <Toggle on={horizontal} onClick={() => setLayoutChoice(horizontal ? "page" : "horizontal")}>
            Cuộn ngang
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

      <div
        ref={scrollRef}
        className={`tab-player tab-scroll rounded-xl border border-line bg-surface p-2 sm:p-4 ${
          horizontal ? "overflow-x-auto overflow-y-hidden overscroll-x-contain" : "overflow-hidden"
        }`}
      >
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
      className={`h-9 shrink-0 rounded-lg border px-2.5 text-xs font-semibold whitespace-nowrap sm:px-3 transition-colors ${
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
