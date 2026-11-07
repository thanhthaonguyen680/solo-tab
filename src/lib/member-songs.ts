import "server-only";
import { loadSheetPages, rowToSong, sql, SONG_COLUMNS, type SongRow } from "./db";
import type { Member } from "./member-auth";
import type { Song } from "./song-model";

/** Bài của một thành viên (mọi trạng thái) — không cache, luôn mới nhất. Chỉ gọi với member đã xác thực. */
export async function listMySongs(member: Member): Promise<(Song & { sheetPageCount: number })[]> {
  const rows = (await sql.query(
    `select ${SONG_COLUMNS},
       (select count(*)::int from song_sheet_pages p
         where p.song_slug = s.slug and p.version = s.sheet_version) as "sheetPageCount"
     from songs s where author_id = $1 order by updated_at desc`,
    [member.id],
  )) as (SongRow & { sheetPageCount: number })[];
  return rows.map((r) => ({ ...rowToSong(r), sheetPageCount: r.sheetPageCount }));
}

export async function getMySong(member: Member, slug: string): Promise<Song | undefined> {
  const rows = (await sql.query(`select ${SONG_COLUMNS} from songs where slug = $1 and author_id = $2`, [
    slug,
    member.id,
  ])) as SongRow[];
  const row = rows[0];
  return row && rowToSong(row, await loadSheetPages(row.slug, row.sheetVersion));
}

/** Giới hạn bài chưa đăng của một thành viên — chống spam */
export const MAX_OPEN_SUBMISSIONS = 20;
