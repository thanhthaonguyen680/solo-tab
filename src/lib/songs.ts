import type { CollectionSlug } from "@/config/site";
import { songs, type Song } from "@/data/songs";

export type SongSummary = Omit<Song, "tab" | "audioUrl"> & {
  hasAudio: boolean;
  isNew: boolean;
};

/** Số bài mới nhất được gắn nhãn "Mới". */
const NEW_COUNT = 4;

const newestSlugs = new Set(
  [...songs]
    .sort((a, b) => b.addedAt.localeCompare(a.addedAt))
    .slice(0, NEW_COUNT)
    .map((s) => s.slug),
);

/** Bản tóm tắt gửi xuống client — không kèm tab / audio để không lộ nội dung trả phí. */
function summarize(song: Song): SongSummary {
  const { tab, audioUrl, ...rest } = song;
  void tab;
  return { ...rest, hasAudio: Boolean(audioUrl), isNew: newestSlugs.has(rest.slug) };
}

export function getSongs(collection?: CollectionSlug): SongSummary[] {
  return songs
    .filter((s) => !collection || s.collection === collection)
    .map(summarize);
}

export function getLatestSongs(limit: number): SongSummary[] {
  return getSongs()
    .sort((a, b) => b.addedAt.localeCompare(a.addedAt))
    .slice(0, limit);
}

export function getSong(slug: string): (Song & SongSummary) | undefined {
  const song = songs.find((s) => s.slug === slug);
  return song && { ...song, ...summarize(song) };
}

export function countSongs(collection?: CollectionSlug) {
  return getSongs(collection).length;
}

export function allSongSlugs() {
  return songs.map((s) => s.slug);
}
