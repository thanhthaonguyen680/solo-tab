import "server-only";
import { updateTag, revalidatePath } from "next/cache";
import { isAdmin } from "./admin-auth";
import { LANGS, paths } from "@/i18n";
import { SONGS_TAG } from "./songs";

/**
 * Ai được sửa nội dung (sheet / tab) của một bài: chỉ admin.
 * Người đóng góp không có tài khoản → gửi xong là bài thuộc về admin duyệt / chỉnh.
 */
export async function canEditSong(): Promise<boolean> {
  return isAdmin();
}

/** Ai được xem sheet / tab của bài chưa đăng: chỉ admin */
export async function canPreviewSong(): Promise<boolean> {
  return isAdmin();
}

/**
 * Làm mới dữ liệu bài trên site công khai ngay sau khi sửa.
 * updateTag làm mới dữ liệu cache; revalidatePath buộc trang của chính bài đó render lại.
 */
export function refreshPublicPages(...slugs: (string | null)[]) {
  updateTag(SONGS_TAG);
  for (const slug of new Set(slugs)) if (slug) for (const lang of LANGS) revalidatePath(paths.song(lang, slug));
}
