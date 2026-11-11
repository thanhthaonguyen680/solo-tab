"use server";

import { sql } from "./db";
import { isValidFileNotation } from "./notation-format";
import { canEditSong, refreshPublicPages } from "./song-access";
import { NOTATION_MAX_CHARS, SHEET_VERSION_PATTERN } from "./song-model";

/** Sheet PDF + tab tương tác của một bài (trang admin). */

export type SheetResult = { ok: true } | { ok: false; error: string };

const DENIED: SheetResult = { ok: false, error: "Bạn không có quyền sửa bài này (hoặc phiên đăng nhập đã hết)" };

/**
 * Kích hoạt sheet vừa tải lên: chỉ khi đã có đủ `pageCount` trang liên tục 1..n.
 * Đổi version, lưu tab tương tác đọc được từ PDF (nếu có) và xoá các version cũ trong cùng một transaction.
 */
export async function commitSheet(
  slug: string,
  version: string,
  pageCount: number,
  notation: string | null = null,
): Promise<SheetResult> {
  if (!(await canEditSong())) return DENIED;
  if (!SHEET_VERSION_PATTERN.test(version) || !Number.isInteger(pageCount) || pageCount < 1) {
    return { ok: false, error: "Dữ liệu không hợp lệ" };
  }
  if (notation !== null && (typeof notation !== "string" || notation.length > NOTATION_MAX_CHARS)) {
    return { ok: false, error: "Dữ liệu tab tương tác không hợp lệ" };
  }

  const [{ n, maxPage }] = await sql.query(
    `select count(*)::int as n, coalesce(max(page), 0)::int as "maxPage"
     from song_sheet_pages where song_slug = $1 and version = $2`,
    [slug, version],
  );
  if (n !== pageCount || maxPage !== pageCount) {
    return { ok: false, error: `Mới tải lên ${n}/${pageCount} trang — hãy thử lại` };
  }

  const [updated] = await sql.transaction([
    // Tab lấy từ file Guitar Pro gốc chính xác hơn bản đọc từ PDF → giữ nguyên nếu đã có
    sql`update songs set sheet_version = ${version},
          notation = case when notation like '@score:%' then notation else ${notation} end,
          updated_at = now()
        where slug = ${slug} returning slug`,
    sql`delete from song_sheet_pages where song_slug = ${slug} and version <> ${version}`,
  ]);
  if (updated.length === 0) return { ok: false, error: "Không tìm thấy bài" };

  refreshPublicPages(slug);
  return { ok: true };
}

export async function removeSheet(slug: string): Promise<SheetResult> {
  if (!(await canEditSong())) return DENIED;
  await sql.transaction([
    sql`update songs set sheet_version = null,
          notation = case when notation like '@score:%' then notation else null end,
          updated_at = now()
        where slug = ${slug}`,
    sql`delete from song_sheet_pages where song_slug = ${slug}`,
  ]);
  refreshPublicPages(slug);
  return { ok: true };
}

/** Lưu file Guitar Pro / MusicXML gốc làm tab tương tác (không đụng tới sheet PDF) */
export async function saveScore(slug: string, notation: string): Promise<SheetResult> {
  if (!(await canEditSong())) return DENIED;
  if (typeof notation !== "string" || !isValidFileNotation(notation)) {
    return { ok: false, error: "File tab không hợp lệ hoặc quá lớn" };
  }
  const rows = await sql`update songs set notation = ${notation}, updated_at = now() where slug = ${slug} returning slug`;
  if (rows.length === 0) return { ok: false, error: "Không tìm thấy bài" };
  refreshPublicPages(slug);
  return { ok: true };
}

/** Bỏ tab tương tác của bài (giữ sheet PDF nếu có) */
export async function removeScore(slug: string): Promise<SheetResult> {
  if (!(await canEditSong())) return DENIED;
  await sql`update songs set notation = null, updated_at = now() where slug = ${slug}`;
  refreshPublicPages(slug);
  return { ok: true };
}
