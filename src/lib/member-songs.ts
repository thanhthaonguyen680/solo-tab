import "server-only";
import { rowToSong, sql, SONG_COLUMNS, type SongRow } from "./db";
import type { Member } from "./member-auth";
import type { Song } from "./song-model";

/** Bài thành viên đã gửi (mọi trạng thái) — không cache. Chỉ gọi với member đã xác thực. */
export async function listMySongs(member: Member): Promise<Song[]> {
  const rows = (await sql.query(`select ${SONG_COLUMNS} from songs s where author_id = $1 order by created_at desc`, [
    member.id,
  ])) as SongRow[];
  return rows.map((r) => rowToSong(r));
}

/** Giới hạn bài đang chờ duyệt của một thành viên — chống spam */
export const MAX_OPEN_SUBMISSIONS = 20;
