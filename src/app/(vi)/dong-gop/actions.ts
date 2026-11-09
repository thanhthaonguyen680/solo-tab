"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { collections } from "@/config/site";
import { sql } from "@/lib/db";
import { endMemberSession, requireMember } from "@/lib/member-auth";
import { MAX_OPEN_SUBMISSIONS } from "@/lib/member-songs";
import { isFileNotation, isValidFileNotation } from "@/lib/notation-format";
import { LEVELS, NOTATION_MAX_CHARS, slugify } from "@/lib/song-model";

export async function logoutMember() {
  await endMemberSession();
  redirect("/");
}

export type Contribution = {
  title: string;
  artist: string;
  collection: string;
  level: string;
  /** Tab tương tác: "@score:<track>;<base64>" (file Guitar Pro) hoặc alphaTex (đọc từ PDF) */
  notation: string;
  tempo: number | null;
  rights: boolean;
};

export type ContributionResult = { ok: true; title: string } | { ok: false; error: string };

/** Thành viên gửi một bài (file đã được đọc thành tab tương tác ngay trên trình duyệt) → chờ admin duyệt */
export async function submitContribution(c: Contribution): Promise<ContributionResult> {
  const member = await requireMember("/dong-gop");

  const title = String(c?.title ?? "").trim();
  const artist = String(c?.artist ?? "").trim();
  if (!title || title.length > 200) return { ok: false, error: "Nhập tên bài (tối đa 200 ký tự)" };
  if (artist.length > 200) return { ok: false, error: "Tên ca sĩ / tác giả tối đa 200 ký tự" };
  if (!Object.hasOwn(collections, c.collection)) return { ok: false, error: "Chọn kho bài" };
  if (!(LEVELS as readonly string[]).includes(c.level)) return { ok: false, error: "Chọn độ khó" };
  if (c.rights !== true) return { ok: false, error: "Bạn cần xác nhận mình tự soạn (hoặc được phép đăng) tab này" };

  const notation = typeof c.notation === "string" ? c.notation : "";
  const notationOk = isFileNotation(notation)
    ? isValidFileNotation(notation)
    : notation.length > 0 && notation.length <= NOTATION_MAX_CHARS && /\|/.test(notation);
  if (!notationOk) return { ok: false, error: "Dữ liệu tab không hợp lệ hoặc quá lớn" };
  const bpm = Number.isInteger(c.tempo) && c.tempo! >= 20 && c.tempo! <= 400 ? c.tempo : null;

  const [{ n }] = await sql`select count(*)::int as n from songs where author_id = ${member.id} and status = 'pending'`;
  if (n >= MAX_OPEN_SUBMISSIONS) {
    return { ok: false, error: `Bạn đang có ${n} bài chờ duyệt — đợi admin duyệt bớt rồi gửi tiếp nhé` };
  }

  // Đường dẫn trùng với bài khác → thêm số: ten-bai-2, ten-bai-3…
  const base = slugify(title).slice(0, 80).replace(/-+$/, "") || "bai";
  for (let i = 1; i <= 50; i++) {
    const slug = i === 1 ? base : `${base}-${i}`;
    const rows = await sql`
      insert into songs (slug, title, artist, collection, level, bpm, notation, status, author_id, submitted_at)
      values (${slug}, ${title}, ${artist || null}, ${c.collection}, ${c.level}, ${bpm}, ${notation},
              'pending', ${member.id}, now())
      on conflict (slug) do nothing
      returning slug`;
    if (rows.length) {
      revalidatePath("/dong-gop");
      return { ok: true, title };
    }
  }
  return { ok: false, error: "Không tạo được đường dẫn cho bài — thử đổi tên bài" };
}

/** Xoá bài mình đã gửi (chưa được đăng) */
export async function deleteContribution(slug: string) {
  const member = await requireMember("/dong-gop");
  await sql`delete from songs where slug = ${slug} and author_id = ${member.id} and status <> 'published'`;
  revalidatePath("/dong-gop");
}
