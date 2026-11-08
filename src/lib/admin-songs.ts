import "server-only";
import { requireAdmin } from "./admin-auth";
import { loadSheetPages, rowToSong, sql, SONG_COLUMNS, type SongRow } from "./db";
import type { Song } from "./song-model";

/** Danh sách bài cho trang admin — không cache, luôn là dữ liệu mới nhất. */
export async function listSongsForAdmin(): Promise<(Song & { sheetPageCount: number })[]> {
  await requireAdmin();
  const rows = (await sql.query(
    `select ${SONG_COLUMNS},
       (select count(*)::int from song_sheet_pages p
         where p.song_slug = s.slug and p.version = s.sheet_version) as "sheetPageCount"
     from songs s order by added_at desc, created_at desc`,
  )) as (SongRow & { sheetPageCount: number })[];
  return rows.map((r) => ({ ...rowToSong(r), sheetPageCount: r.sheetPageCount }));
}

/** Thông tin người gửi bài (cho admin duyệt) */
export async function getAuthorForAdmin(authorId: number) {
  await requireAdmin();
  const [row] = await sql`select username as name, created_at::date::text as "since" from users where id = ${authorId}`;
  return row as { name: string; since: string } | undefined;
}

export async function getSongForAdmin(slug: string): Promise<Song | undefined> {
  await requireAdmin();
  const rows = (await sql.query(`select ${SONG_COLUMNS} from songs where slug = $1`, [slug])) as SongRow[];
  const row = rows[0];
  return row && rowToSong(row, await loadSheetPages(row.slug, row.sheetVersion));
}
