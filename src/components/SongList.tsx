"use client";

import { useState } from "react";
import { dict, type Lang } from "@/i18n";
import type { SongSummary } from "@/lib/songs";
import { buttonSecondary } from "./buttons";
import { SongCard } from "./SongCard";

/** Số bài hiện mỗi lần (ban đầu và mỗi lần bấm "Xem thêm") */
const PAGE = 20;

/** Danh sách bài trên trang chủ: hiện 20 bài đầu, bấm "Xem thêm" để hiện tiếp */
export function SongList({ songs, lang }: { songs: SongSummary[]; lang: Lang }) {
  const [shown, setShown] = useState(PAGE);
  const left = songs.length - shown;
  return (
    <>
      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {songs.slice(0, shown).map((s) => (
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
