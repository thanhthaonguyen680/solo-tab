"use client";

import { useState } from "react";
import { dict, type Lang } from "@/i18n";
import { type SongSort, sortSongs } from "@/lib/song-sort";
import type { SongSummary } from "@/lib/songs";
import { buttonSecondary } from "./buttons";
import { SongCard } from "./SongCard";

/** Số bài hiện mỗi lần (ban đầu và mỗi lần bấm "Xem thêm") */
const PAGE = 20;
const SORTS: SongSort[] = ["newest", "oldest", "easy", "hard"];

/** Danh sách bài trên trang chủ: chọn cách sắp xếp, hiện 20 bài đầu, bấm "Xem thêm" để hiện tiếp */
export function SongList({ songs, lang }: { songs: SongSummary[]; lang: Lang }) {
  const t = dict[lang].browser;
  const [sort, setSort] = useState<SongSort>("newest");
  const [shown, setShown] = useState(PAGE);
  const sorted = sortSongs(songs, sort);
  const left = sorted.length - shown;
  return (
    <>
      <div className="mt-6 flex justify-end">
        <label className="flex items-center gap-2 text-sm text-muted">
          {t.sort}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SongSort)}
            className="h-10 rounded-lg border border-border bg-surface px-2 text-sm font-medium text-soft outline-none focus:border-accent"
          >
            {SORTS.map((s) => (
              <option key={s} value={s}>
                {t[s]}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {sorted.slice(0, shown).map((s) => (
          <SongCard key={s.slug} song={s} lang={lang} />
        ))}
      </div>
      {left > 0 && (
        <div className="mt-8 flex justify-center">
          <button type="button" onClick={() => setShown((n) => n + PAGE)} className={buttonSecondary("lg")}>
            {dict[lang].home.more(left)}
          </button>
        </div>
      )}
    </>
  );
}
