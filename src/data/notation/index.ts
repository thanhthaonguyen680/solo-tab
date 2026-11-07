/**
 * Dữ liệu nốt (alphaTex) cho tab tương tác, theo slug bài.
 * Mỗi file được tạo bằng `npm run notation -- <slug>` từ scripts/tab-audio/scores/<slug>.mjs.
 * Nạp theo yêu cầu để không gom dữ liệu mọi bài vào một chỗ.
 */
const loaders: Record<string, () => Promise<{ notation: string }>> = {
  "beo-dat-may-troi": () => import("./beo-dat-may-troi"),
};

/**
 * Lấy dữ liệu nốt của bài. `bpm` (ô Tempo trong admin) — nếu có — thay tempo gốc trong dữ liệu nốt,
 * để trình phát và khuông nhạc (♩ = …) dùng đúng tempo mặc định đặt cho bài.
 */
export async function getNotation(slug: string, bpm?: number): Promise<string | null> {
  const load = loaders[slug];
  if (!load) return null;
  const { notation } = await load();
  return bpm ? notation.replace(/^\\tempo \d+/m, `\\tempo ${bpm}`) : notation;
}
