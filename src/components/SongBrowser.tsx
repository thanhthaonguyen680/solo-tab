"use client";

import { useMemo, useState } from "react";
import { matches } from "@/lib/search";
import type { SongSummary } from "@/lib/songs";
import { SongCard } from "./SongCard";

type Sort = "az" | "za" | "newest";

const sorters: Record<Sort, (a: SongSummary, b: SongSummary) => number> = {
  az: (a, b) => a.title.localeCompare(b.title, "vi"),
  za: (a, b) => b.title.localeCompare(a.title, "vi"),
  newest: (a, b) => b.addedAt.localeCompare(a.addedAt),
};

export function SongBrowser({ songs }: { songs: SongSummary[] }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("az");
  const [audioOnly, setAudioOnly] = useState(false);

  const visible = useMemo(
    () =>
      songs
        .filter((s) => !audioOnly || s.hasAudio)
        .filter((s) => matches(query, [s.title, s.artist, ...s.tags]))
        .sort(sorters[sort]),
    [songs, query, sort, audioOnly],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="sticky top-14 z-10 -mx-4 flex flex-col gap-2 border-b border-border bg-bg/90 px-4 py-3 backdrop-blur sm:flex-row sm:items-center">
        <label className="relative flex-1">
          <span className="sr-only">Tìm bài</span>
          <svg viewBox="0 0 20 20" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden>
            <path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" d="m14 14 4 4M8.5 15a6.5 6.5 0 1 1 0-13 6.5 6.5 0 0 1 0 13Z" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm bài, tác giả, phiên bản… (gõ không dấu cũng được)"
            className="h-10 w-full rounded-lg border border-border bg-surface pr-3 pl-9 text-sm outline-none placeholder:text-muted focus:border-accent"
          />
        </label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setAudioOnly((v) => !v)}
            aria-pressed={audioOnly}
            className={`h-10 rounded-lg border px-3 text-sm transition-colors ${
              audioOnly ? "border-accent bg-accent/15 text-accent" : "border-border bg-surface text-muted hover:text-text"
            }`}
          >
            Có audio
          </button>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            aria-label="Sắp xếp"
            className="h-10 rounded-lg border border-border bg-surface px-2 text-sm outline-none focus:border-accent"
          >
            <option value="az">Tên A → Z</option>
            <option value="za">Tên Z → A</option>
            <option value="newest">Mới thêm</option>
          </select>
        </div>
      </div>

      <p className="font-mono text-xs text-muted">
        {visible.length} / {songs.length} bài
      </p>

      {visible.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {visible.map((s) => (
            <SongCard key={s.slug} song={s} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-muted">
          Không tìm thấy bài nào khớp “{query}”.
        </div>
      )}
    </div>
  );
}
