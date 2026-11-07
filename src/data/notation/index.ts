import type { Song } from "@/lib/song-model";

/**
 * Dữ liệu nốt chép tay (alphaTex) theo slug — dùng khi bài chưa có tab đọc tự động từ PDF.
 * Mỗi file được tạo bằng `npm run notation -- <slug>` từ scripts/tab-audio/scores/<slug>.mjs.
 */
const handmade: Record<string, () => Promise<{ notation: string }>> = {
  "beo-dat-may-troi": () => import("./beo-dat-may-troi"),
};

/**
 * Tab tương tác của bài: ưu tiên bản đọc tự động từ sheet PDF (lưu trong database), sau đó tới bản chép tay.
 * Ô Tempo trong admin (nếu có) thay tempo gốc, để trình phát và khuông nhạc dùng đúng tempo mặc định.
 */
export async function getNotation(song: Pick<Song, "slug" | "notation" | "bpm">): Promise<string | null> {
  const load = handmade[song.slug];
  const notation = song.notation ?? (load ? (await load()).notation : null);
  if (!notation) return null;
  return song.bpm ? notation.replace(/^\\tempo \d+/m, `\\tempo ${song.bpm}`) : notation;
}
