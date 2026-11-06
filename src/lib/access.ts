import type { Song } from "@/data/songs";

/**
 * Quyết định người xem có được mở bài hay không.
 * Hiện chưa có đăng nhập / thanh toán nên chỉ bài `free` được mở.
 * TODO: khi có auth, kiểm tra gói thành viên còn hạn của user ở đây.
 */
export function canViewSong(song: Pick<Song, "free">): boolean {
  return Boolean(song.free);
}
