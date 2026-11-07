import { sql } from "@/lib/db";
import { sniffImageType } from "@/lib/sheet-image";
import { canEditSong } from "@/lib/song-access";
import { SHEET_LIMITS, SHEET_VERSION_PATTERN } from "@/lib/song-model";

/**
 * Admin / thành viên (bài của mình, chưa đăng) tải lên ảnh MỘT trang của sheet (đã được trình duyệt chuyển từ PDF sang ảnh).
 * Mỗi trang là một request riêng để không vượt giới hạn kích thước request của Vercel.
 * Trang được lưu dưới `version` mới; sheet chỉ đổi sang version này khi admin gọi
 * commitSheet() sau khi tải đủ mọi trang.
 *
 * Body (multipart/form-data): version, page (1..n), width, height, file
 */
export async function POST(request: Request, ctx: RouteContext<"/api/sheet-upload/[slug]">) {
  // Chỉ nhận request từ chính site (chống CSRF) và từ người có quyền sửa bài
  const origin = request.headers.get("origin");
  if (!origin || new URL(origin).host !== new URL(request.url).host) {
    return Response.json({ error: "Nguồn request không hợp lệ" }, { status: 403 });
  }
  const { slug } = await ctx.params;
  if (!(await canEditSong(slug))) {
    return Response.json({ error: "Bạn không có quyền sửa bài này, hoặc phiên đăng nhập đã hết" }, { status: 401 });
  }

  const form = await request.formData().catch(() => null);
  if (!form) return Response.json({ error: "Dữ liệu gửi lên không hợp lệ" }, { status: 400 });

  const version = String(form.get("version") ?? "");
  const page = Number(form.get("page"));
  const width = Number(form.get("width"));
  const height = Number(form.get("height"));
  const file = form.get("file");

  if (!SHEET_VERSION_PATTERN.test(version)) return bad("version không hợp lệ");
  if (!Number.isInteger(page) || page < 1 || page > SHEET_LIMITS.maxPages) return bad("Số trang không hợp lệ");
  if (![width, height].every((n) => Number.isInteger(n) && n > 0 && n <= 6000)) return bad("Kích thước ảnh không hợp lệ");
  if (!(file instanceof Blob) || file.size === 0) return bad("Thiếu file ảnh");
  if (file.size > SHEET_LIMITS.maxPageBytes) return bad("Ảnh trang quá lớn");

  const bytes = new Uint8Array(await file.arrayBuffer());
  const contentType = sniffImageType(bytes);
  if (!contentType) return bad("File không phải ảnh WebP/JPEG/PNG");

  const [song] = await sql.query("select sheet_version from songs where slug = $1", [slug]);
  if (!song) return Response.json({ error: "Không tìm thấy bài" }, { status: 404 });

  // Lần tải mới bắt đầu: dọn các lần tải dở trước đó (không đụng sheet đang dùng)
  if (page === 1) {
    await sql.query(
      `delete from song_sheet_pages
       where song_slug = $1 and version <> $2 and version is distinct from $3`,
      [slug, version, song.sheet_version],
    );
  }

  await sql.query(
    `insert into song_sheet_pages (song_slug, version, page, image, content_type, width, height)
     values ($1, $2, $3, $4, $5, $6, $7)
     on conflict (song_slug, version, page)
     do update set image = excluded.image, content_type = excluded.content_type,
                   width = excluded.width, height = excluded.height`,
    [slug, version, page, Buffer.from(bytes), contentType, width, height],
  );

  return Response.json({ ok: true });
}

function bad(error: string) {
  return Response.json({ error }, { status: 400 });
}
