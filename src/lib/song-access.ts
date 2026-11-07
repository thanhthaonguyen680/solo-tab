import "server-only";
import { updateTag, revalidatePath } from "next/cache";
import { isAdmin } from "./admin-auth";
import { sql } from "./db";
import { getMember } from "./member-auth";
import { SONGS_TAG } from "./songs";

/**
 * Ai được sửa nội dung (sheet / tab) của một bài:
 * - admin: mọi bài;
 * - thành viên: chỉ bài do mình gửi và chưa được đăng (nháp, chờ duyệt, bị từ chối).
 */
export async function canEditSong(slug: string): Promise<boolean> {
  if (await isAdmin()) return true;
  const member = await getMember();
  if (!member) return false;
  const [row] = await sql`select author_id::int as "authorId", status from songs where slug = ${slug}`;
  return Boolean(row) && row.authorId === member.id && row.status !== "published";
}

/** Ai được xem sheet / tab của bài chưa đăng: admin và chính người gửi */
export async function canPreviewSong(slug: string): Promise<boolean> {
  if (await isAdmin()) return true;
  const member = await getMember();
  if (!member) return false;
  const [row] = await sql`select author_id::int as "authorId" from songs where slug = ${slug}`;
  return Boolean(row) && row.authorId === member.id;
}

/**
 * Làm mới dữ liệu bài trên site công khai ngay sau khi sửa.
 * updateTag làm mới dữ liệu cache; revalidatePath buộc trang của chính bài đó render lại.
 */
export function refreshPublicPages(...slugs: (string | null)[]) {
  updateTag(SONGS_TAG);
  for (const slug of new Set(slugs)) if (slug) revalidatePath(`/bai/${slug}`);
}
