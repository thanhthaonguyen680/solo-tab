"use server";

import { redirect } from "next/navigation";
import { sql } from "@/lib/db";
import { endMemberSession, requireMember } from "@/lib/member-auth";
import { MAX_OPEN_SUBMISSIONS } from "@/lib/member-songs";
import { parseSongForm, slugify, type SongFieldErrors } from "@/lib/song-model";

export async function logoutMember() {
  await endMemberSession();
  redirect("/");
}

export type SubmissionFormState = {
  errors?: SongFieldErrors & { rights?: string };
  message?: string;
  saved?: boolean;
  values?: Record<string, string>;
  attempt?: number;
};

function formValues(form: FormData) {
  const values: Record<string, string> = {};
  for (const [k, v] of form) if (typeof v === "string") values[k] = v;
  return values;
}

/** Đọc form thông tin bài của thành viên (dùng lại bộ kiểm tra của admin, bỏ các ô chỉ admin được đặt) */
function parse(form: FormData) {
  const title = String(form.get("title") ?? "").trim();
  form.set("slug", slugify(title).slice(0, 80).replace(/-+$/, "") || "bai");
  for (const adminOnly of ["audioUrl", "free", "addedAt"]) form.delete(adminOnly);
  return parseSongForm(form);
}

/** Thành viên tạo bài mới (nháp) → chuyển sang trang thêm tab */
export async function createSubmission(prev: SubmissionFormState, form: FormData): Promise<SubmissionFormState> {
  const member = await requireMember("/dong-gop/moi");
  const fail = (s: SubmissionFormState): SubmissionFormState => ({ ...s, values: formValues(form), attempt: (prev.attempt ?? 0) + 1 });

  const rights = form.get("rights") === "on";
  const parsed = parse(form);
  if (!parsed.ok || !rights) {
    return fail({
      errors: { ...(parsed.ok ? {} : parsed.errors), ...(rights ? {} : { rights: "Bạn cần xác nhận điều này để gửi bài" }) },
      message: "Kiểm tra lại các ô được đánh dấu",
    });
  }
  const s = parsed.song;

  const [{ n }] = await sql`select count(*)::int as n from songs where author_id = ${member.id} and status <> 'published'`;
  if (n >= MAX_OPEN_SUBMISSIONS) {
    return fail({ message: `Bạn đang có ${n} bài chưa đăng — hoàn thành hoặc xoá bớt trước khi tạo bài mới` });
  }

  // Đường dẫn trùng với bài khác → thêm số: ten-bai-2, ten-bai-3…
  for (let i = 1; i <= 50; i++) {
    const slug = i === 1 ? s.slug : `${s.slug}-${i}`;
    const rows = await sql`
      insert into songs (slug, title, artist, collection, tags, level, key, bpm, status, author_id)
      values (${slug}, ${s.title}, ${s.artist ?? null}, ${s.collection}, ${s.tags}, ${s.level}, ${s.key ?? null},
              ${s.bpm ?? null}, 'draft', ${member.id})
      on conflict (slug) do nothing
      returning slug`;
    if (rows.length) redirect(`/dong-gop/${slug}?moi=1`);
  }
  return fail({ message: "Không tạo được đường dẫn cho bài — thử đổi tên bài" });
}

/** Sửa thông tin bài của mình (chưa đăng) */
export async function updateSubmission(slug: string, prev: SubmissionFormState, form: FormData): Promise<SubmissionFormState> {
  const member = await requireMember(`/dong-gop/${slug}`);
  const fail = (s: SubmissionFormState): SubmissionFormState => ({ ...s, values: formValues(form), attempt: (prev.attempt ?? 0) + 1 });
  const parsed = parse(form);
  if (!parsed.ok) return fail({ errors: parsed.errors, message: "Kiểm tra lại các ô được đánh dấu" });
  const s = parsed.song;
  const rows = await sql`
    update songs set title = ${s.title}, artist = ${s.artist ?? null}, collection = ${s.collection}, tags = ${s.tags},
      level = ${s.level}, key = ${s.key ?? null}, bpm = ${s.bpm ?? null}, updated_at = now()
    where slug = ${slug} and author_id = ${member.id} and status <> 'published'
    returning slug`;
  if (!rows.length) return fail({ message: "Không sửa được — bài đã được đăng hoặc không còn tồn tại" });
  return { saved: true, attempt: (prev.attempt ?? 0) + 1 };
}

/** Gửi bài cho admin duyệt — cần có tab tương tác hoặc sheet PDF */
export async function submitForReview(slug: string) {
  const member = await requireMember(`/dong-gop/${slug}`);
  const rows = await sql`
    update songs set status = 'pending', submitted_at = now(), updated_at = now()
    where slug = ${slug} and author_id = ${member.id} and status in ('draft', 'rejected')
      and (notation is not null or sheet_version is not null)
    returning slug`;
  redirect(`/dong-gop/${encodeURIComponent(slug)}?${rows.length ? "da-gui=1" : "loi=chua-co-tab"}`);
}

/** Rút bài đang chờ duyệt về nháp (để sửa tiếp) */
export async function withdrawSubmission(slug: string) {
  const member = await requireMember(`/dong-gop/${slug}`);
  await sql`update songs set status = 'draft', updated_at = now()
            where slug = ${slug} and author_id = ${member.id} and status = 'pending'`;
  redirect(`/dong-gop/${encodeURIComponent(slug)}`);
}

/** Xoá bài của mình (chưa đăng) */
export async function deleteSubmission(slug: string) {
  const member = await requireMember(`/dong-gop/${slug}`);
  await sql`delete from songs where slug = ${slug} and author_id = ${member.id} and status <> 'published'`;
  redirect("/dong-gop?da-xoa=1");
}
