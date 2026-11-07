import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { CollectionSlug } from "@/config/site";
import { loadSheetPages, rowToSong, sql, SONG_COLUMNS, type SongRow } from "./db";
import type { Song } from "./song-model";

/** Tag cache của mọi dữ liệu bài hát — trang admin gọi updateTag(SONGS_TAG) sau khi sửa. */
export const SONGS_TAG = "songs";

export type SongSummary = Omit<Song, "tab" | "audioUrl" | "sheet" | "notation"> & {
  hasAudio: boolean;
  isNew: boolean;
};

/** Số bài mới nhất được gắn nhãn "Mới". */
const NEW_COUNT = 4;

/** Toàn bộ bài (kèm tab) — chỉ dùng trong file này, không gửi thẳng xuống client. */
async function loadAll(): Promise<{ songs: Song[]; newest: string[] }> {
  "use cache";
  cacheTag(SONGS_TAG);
  cacheLife("hours");

  const rows = (await sql.query(
    `select ${SONG_COLUMNS} from songs order by added_at desc, created_at desc`,
  )) as SongRow[];
  const songs = rows.map((r) => rowToSong(r));
  return { songs, newest: songs.slice(0, NEW_COUNT).map((s) => s.slug) };
}

/** Bản tóm tắt gửi xuống client — không kèm tab / audio để không lộ nội dung trả phí. */
function summarize(song: Song, newest: string[]): SongSummary {
  const { tab, audioUrl, sheet, notation, ...rest } = song;
  void tab;
  void sheet;
  void notation;
  return { ...rest, hasAudio: Boolean(audioUrl), isNew: newest.includes(rest.slug) };
}

export async function getSongs(collection?: CollectionSlug): Promise<SongSummary[]> {
  const { songs, newest } = await loadAll();
  return songs.filter((s) => !collection || s.collection === collection).map((s) => summarize(s, newest));
}

/**
 * Một bài theo slug. Truy vấn riêng (không lọc từ loadAll) vì khung trang /bai/[slug] được
 * prerender lúc build: nếu dùng loadAll, danh sách lúc build bị đóng gói vào khung và bài
 * thêm sau đó sẽ báo "không tìm thấy".
 */
async function loadOne(slug: string): Promise<(Song & { isNew: boolean }) | undefined> {
  "use cache";
  cacheTag(SONGS_TAG);
  cacheLife("hours");

  const rows = (await sql.query(
    `select ${SONG_COLUMNS},
       (select count(*) from songs newer
         where (newer.added_at, newer.created_at) > (s.added_at, s.created_at)) < ${NEW_COUNT} as "isNew"
     from songs s where slug = $1`,
    [slug],
  )) as (SongRow & { isNew: boolean })[];
  const row = rows[0];
  if (!row) return undefined;
  return { ...rowToSong(row, await loadSheetPages(row.slug, row.sheetVersion)), isNew: row.isNew };
}

export async function getSong(slug: string): Promise<(Song & SongSummary) | undefined> {
  const song = await loadOne(slug);
  return song && { ...song, hasAudio: Boolean(song.audioUrl) };
}

export async function countSongs(collection?: CollectionSlug) {
  return (await getSongs(collection)).length;
}

export async function allSongSlugs() {
  return (await loadAll()).songs.map((s) => s.slug);
}
