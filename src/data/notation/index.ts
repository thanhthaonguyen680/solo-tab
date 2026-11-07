/**
 * Dữ liệu nốt (alphaTex) cho tab tương tác, theo slug bài.
 * Mỗi file được tạo bằng `npm run notation -- <slug>` từ scripts/tab-audio/scores/<slug>.mjs.
 * Nạp theo yêu cầu để không gom dữ liệu mọi bài vào một chỗ.
 */
const loaders: Record<string, () => Promise<{ notation: string }>> = {
  "beo-dat-may-troi": () => import("./beo-dat-may-troi"),
};

export async function getNotation(slug: string): Promise<string | null> {
  const load = loaders[slug];
  return load ? (await load()).notation : null;
}
