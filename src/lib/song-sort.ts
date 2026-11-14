import type { Level } from "@/lib/song-model";
import type { SongSummary } from "@/lib/songs";

/** Cách sắp xếp danh sách bài (dùng ở trang chủ và trang kho bài) */
export type SongSort = "newest" | "oldest" | "easy" | "hard" | "az" | "za";

const LEVEL_RANK: Record<Level, number> = { "Dễ": 1, "Vừa": 2, "Khó": 3 };

/**
 * Sắp xếp bài. `songs` đến theo thứ tự mới → cũ (như database trả về) nên dùng chính vị trí đó
 * để phân biệt bài thêm cùng ngày; cùng độ khó thì bài mới hơn lên trước.
 */
export function sortSongs(songs: SongSummary[], sort: SongSort): SongSummary[] {
  const age = new Map(songs.map((s, i) => [s.slug, i]));
  const newer = (a: SongSummary, b: SongSummary) => age.get(a.slug)! - age.get(b.slug)!;
  const level = (a: SongSummary, b: SongSummary) => LEVEL_RANK[a.level] - LEVEL_RANK[b.level];
  const compare: Record<SongSort, (a: SongSummary, b: SongSummary) => number> = {
    newest: newer,
    oldest: (a, b) => newer(b, a),
    easy: (a, b) => level(a, b) || newer(a, b),
    hard: (a, b) => level(b, a) || newer(a, b),
    az: (a, b) => a.title.localeCompare(b.title, "vi"),
    za: (a, b) => b.title.localeCompare(a.title, "vi"),
  };
  return [...songs].sort(compare[sort]);
}
