import { isAdmin } from "@/lib/admin-auth";
import { canViewSong } from "@/lib/access";
import { sql } from "@/lib/db";
import { canPreviewSong } from "@/lib/song-access";

/**
 * Ảnh một trang sheet. Kiểm tra quyền xem ở mỗi request — ảnh không có link công khai.
 * Admin luôn xem được (để duyệt sheet của bài chưa mở miễn phí). Bài chưa đăng: chỉ admin và người gửi.
 */
export async function GET(_request: Request, ctx: RouteContext<"/api/sheet/[slug]/[version]/[page]">) {
  const { slug, version, page } = await ctx.params;
  const pageNo = Number(page);
  if (!Number.isInteger(pageNo) || pageNo < 1) return new Response("Not found", { status: 404 });

  const [row] = await sql.query(
    `select s.free, s.status, p.image, p.content_type
     from songs s
     join song_sheet_pages p on p.song_slug = s.slug and p.version = $2 and p.page = $3
     where s.slug = $1 and s.sheet_version = $2`,
    [slug, version, pageNo],
  );
  if (!row) return new Response("Not found", { status: 404 });

  if (row.status !== "published") {
    if (!(await canPreviewSong())) return new Response("Not found", { status: 404 });
  } else if (!canViewSong({ free: row.free }) && !(await isAdmin())) {
    return new Response("Bài này dành cho thành viên", { status: 403 });
  }

  return new Response(new Uint8Array(row.image), {
    headers: {
      "Content-Type": row.content_type,
      // URL có version nên nội dung không đổi; chỉ cho trình duyệt cache (không cache ở CDN)
      // để khi bài chuyển sang trả phí, người khác không lấy được qua cache dùng chung.
      "Cache-Control": "private, max-age=86400",
      "X-Robots-Tag": "noindex",
      "Content-Disposition": "inline",
    },
  });
}
