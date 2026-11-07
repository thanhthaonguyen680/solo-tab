"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { checkAdminPassword, endAdminSession, requireAdmin, startAdminSession } from "@/lib/admin-auth";
import { sql } from "@/lib/db";
import { parseSongForm, SHEET_VERSION_PATTERN, type SongFieldErrors } from "@/lib/song-model";
import { SONGS_TAG } from "@/lib/songs";

// ---------- Đăng nhập ----------

export type LoginState = { error?: string };

export async function login(_prev: LoginState, form: FormData): Promise<LoginState> {
  const password = form.get("password");
  if (typeof password !== "string" || !password) return { error: "Nhập mật khẩu" };

  if (!(await checkAdminPassword(password))) {
    // Làm chậm việc dò mật khẩu
    await new Promise((r) => setTimeout(r, 800));
    return { error: "Sai mật khẩu" };
  }

  await startAdminSession();
  redirect("/admin");
}

export async function logout() {
  await endAdminSession();
  redirect("/admin/dang-nhap");
}

// ---------- Bài hát ----------

/**
 * Làm mới dữ liệu bài trên site công khai ngay sau khi admin sửa.
 * updateTag làm mới dữ liệu cache; revalidatePath buộc trang của chính bài đó render lại
 * ngay lượt xem tiếp theo (nếu không, lượt xem đầu tiên có thể vẫn thấy bản cũ — ví dụ vẫn
 * thấy tab sau khi đã bỏ "miễn phí").
 */
function refreshPublicPages(...slugs: (string | null)[]) {
  updateTag(SONGS_TAG);
  for (const slug of new Set(slugs)) if (slug) revalidatePath(`/bai/${slug}`);
}

export type SongFormState = {
  errors?: SongFieldErrors;
  message?: string;
  /** Giá trị vừa gửi, để giữ lại trên form khi có lỗi */
  values?: Record<string, string>;
  /** Tăng mỗi lần gửi lỗi — dùng làm key để form nạp lại giá trị */
  attempt?: number;
};

function formValues(form: FormData) {
  const values: Record<string, string> = {};
  for (const [k, v] of form) if (typeof v === "string") values[k] = v;
  return values;
}

/** Tạo bài mới (originalSlug = null) hoặc cập nhật bài có slug = originalSlug. */
export async function saveSong(
  originalSlug: string | null,
  prev: SongFormState,
  form: FormData,
): Promise<SongFormState> {
  await requireAdmin();

  const fail = (state: Omit<SongFormState, "values" | "attempt">): SongFormState => ({
    ...state,
    values: formValues(form),
    attempt: (prev.attempt ?? 0) + 1,
  });

  const parsed = parseSongForm(form);
  if (!parsed.ok) return fail({ errors: parsed.errors, message: "Kiểm tra lại các ô được đánh dấu" });
  const s = parsed.song;

  const params = [
    s.slug,
    s.title,
    s.artist ?? null,
    s.collection,
    s.tags,
    s.level,
    s.key ?? null,
    s.bpm ?? null,
    s.audioUrl ?? null,
    s.free ?? false,
    s.addedAt,
  ];

  try {
    if (originalSlug === null) {
      await sql.query(
        `insert into songs (slug, title, artist, collection, tags, level, key, bpm, audio_url, free, added_at)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        params,
      );
    } else {
      const rows = await sql.query(
        `update songs set slug = $1, title = $2, artist = $3, collection = $4, tags = $5, level = $6,
           key = $7, bpm = $8, audio_url = $9, free = $10, added_at = $11, updated_at = now()
         where slug = $12
         returning slug`,
        [...params, originalSlug],
      );
      if (rows.length === 0) return fail({ message: "Bài này không còn tồn tại — có thể đã bị xoá" });
    }
  } catch (err) {
    if ((err as { code?: string }).code === "23505") {
      return fail({ errors: { slug: `Đã có bài dùng đường dẫn “${s.slug}”` }, message: "Đường dẫn bị trùng" });
    }
    throw err;
  }

  refreshPublicPages(s.slug, originalSlug);
  if (originalSlug === null) redirect(`/admin/bai/${encodeURIComponent(s.slug)}?moi=1#sheet`);
  redirect(`/admin?da-luu=${encodeURIComponent(s.slug)}`);
}

// ---------- Sheet PDF ----------

export type SheetResult = { ok: true } | { ok: false; error: string };

/**
 * Kích hoạt sheet vừa tải lên: chỉ khi đã có đủ `pageCount` trang liên tục 1..n.
 * Đổi version và xoá các version cũ trong cùng một transaction.
 */
export async function commitSheet(slug: string, version: string, pageCount: number): Promise<SheetResult> {
  await requireAdmin();
  if (!SHEET_VERSION_PATTERN.test(version) || !Number.isInteger(pageCount) || pageCount < 1) {
    return { ok: false, error: "Dữ liệu không hợp lệ" };
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
    sql`update songs set sheet_version = ${version}, updated_at = now() where slug = ${slug} returning slug`,
    sql`delete from song_sheet_pages where song_slug = ${slug} and version <> ${version}`,
  ]);
  if (updated.length === 0) return { ok: false, error: "Không tìm thấy bài" };

  refreshPublicPages(slug);
  return { ok: true };
}

export async function removeSheet(slug: string): Promise<SheetResult> {
  await requireAdmin();
  await sql.transaction([
    sql`update songs set sheet_version = null, updated_at = now() where slug = ${slug}`,
    sql`delete from song_sheet_pages where song_slug = ${slug}`,
  ]);
  refreshPublicPages(slug);
  return { ok: true };
}

export async function deleteSong(slug: string) {
  await requireAdmin();
  await sql.query("delete from songs where slug = $1", [slug]);
  refreshPublicPages(slug);
  redirect("/admin?da-xoa=1");
}
