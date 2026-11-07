"use server";

import { redirect } from "next/navigation";
import { checkAdminPassword, endAdminSession, requireAdmin, startAdminSession } from "@/lib/admin-auth";
import { sql } from "@/lib/db";
import { refreshPublicPages } from "@/lib/song-access";
import { parseSongForm, type SongFieldErrors } from "@/lib/song-model";

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

// ---------- Duyệt bài thành viên gửi ----------

/** Đăng bài: hiện trên site, ngày thêm = hôm nay (để được gắn nhãn "Mới") */
export async function approveSong(slug: string) {
  await requireAdmin();
  await sql`update songs set status = 'published', added_at = current_date, review_note = null, updated_at = now()
            where slug = ${slug} and status <> 'published'`;
  refreshPublicPages(slug);
  redirect(`/admin?da-duyet=${encodeURIComponent(slug)}`);
}

/** Trả bài về cho thành viên sửa, kèm lời nhắn */
export async function rejectSong(slug: string, form: FormData) {
  await requireAdmin();
  const note = String(form.get("note") ?? "").trim().slice(0, 1000) || null;
  await sql`update songs set status = 'rejected', review_note = ${note}, updated_at = now() where slug = ${slug}`;
  refreshPublicPages(slug);
  redirect(`/admin/bai/${encodeURIComponent(slug)}?da-tra-ve=1`);
}

/** Gỡ bài thành viên đã đăng về trạng thái chờ duyệt (ẩn khỏi site) */
export async function unpublishSong(slug: string) {
  await requireAdmin();
  await sql`update songs set status = 'pending', updated_at = now() where slug = ${slug} and author_id is not null`;
  refreshPublicPages(slug);
  redirect(`/admin/bai/${encodeURIComponent(slug)}`);
}

export async function deleteSong(slug: string) {
  await requireAdmin();
  await sql.query("delete from songs where slug = $1", [slug]);
  refreshPublicPages(slug);
  redirect("/admin?da-xoa=1");
}
