"use client";

import { useMemo, useState } from "react";
import { dict, type Lang } from "@/i18n";
import { matches } from "@/lib/search";
import { type SongSort, sortSongs } from "@/lib/song-sort";
import type { SongSummary } from "@/lib/songs";
import { SongCard } from "./SongCard";

export function SongBrowser({ songs, lang = "vi" }: { songs: SongSummary[]; lang?: Lang }) {
  const t = dict[lang].browser;
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SongSort>("az");
  const [audioOnly, setAudioOnly] = useState(false);

  const visible = useMemo(
    () =>
      sortSongs(songs, sort)
        .filter((s) => !audioOnly || s.hasAudio)
        .filter((s) => matches(query, [s.title, s.artist, ...s.tags])),
    [songs, query, sort, audioOnly],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="sticky top-16 z-10 -mx-4 flex flex-col gap-2 border-b border-line bg-bg/90 px-4 py-3 backdrop-blur-md sm:flex-row sm:items-center">
        <label className="relative flex-1">
          <span className="sr-only">{t.search}</span>
          <svg viewBox="0 0 20 20" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden>
            <path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" d="m14 14 4 4M8.5 15a6.5 6.5 0 1 1 0-13 6.5 6.5 0 0 1 0 13Z" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.placeholder}
            className="h-11 w-full rounded-lg border border-border bg-surface pr-3 pl-9 text-sm outline-none transition-colors placeholder:text-muted focus:border-accent"
          />
        </label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setAudioOnly((v) => !v)}
            aria-pressed={audioOnly}
            className={`h-11 rounded-lg border px-3 text-sm font-semibold transition-colors ${
              audioOnly ? "border-accent bg-accent text-accent-fg" : "border-border bg-surface text-soft hover:border-muted"
            }`}
          >
            {t.audioOnly}
          </button>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SongSort)}
            aria-label={t.sort}
            className="h-11 rounded-lg border border-border bg-surface px-2 text-sm font-medium text-soft outline-none focus:border-accent"
          >
            <option value="az">{t.az}</option>
            <option value="za">{t.za}</option>
            <option value="newest">{t.newest}</option>
            <option value="oldest">{t.oldest}</option>
            <option value="easy">{t.easy}</option>
            <option value="hard">{t.hard}</option>
          </select>
        </div>
      </div>

      <p className="font-mono text-xs text-muted">
        {t.count(visible.length, songs.length)}
      </p>

      {visible.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {visible.map((s) => (
            <SongCard key={s.slug} song={s} lang={lang} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-muted">
          {songs.length === 0
            ? t.empty
            : query
              ? t.noMatch(query)
              : t.noAudio}
        </div>
      )}
    </div>
  );
}
