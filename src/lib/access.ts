import { site } from "@/config/site";
import type { Song } from "@/lib/song-model";

/**
 * Quyết định người xem có được mở bài hay không.
 * Khi tắt gói thành viên (site.membership = false) thì mọi bài đều mở.
 * Khi bật: hiện chưa có đăng nhập / thanh toán nên chỉ bài `free` được mở.
 * TODO: khi có auth, kiểm tra gói thành viên còn hạn của user ở đây.
 */
export function canViewSong(song: Pick<Song, "free">): boolean {
  if (!site.membership) return true;
  return Boolean(song.free);
}
