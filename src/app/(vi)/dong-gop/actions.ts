"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { collections } from "@/config/site";
import { sql } from "@/lib/db";
import { isFileNotation, isValidFileNotation } from "@/lib/notation-format";
import { LEVELS, NOTATION_MAX_CHARS, slugify } from "@/lib/song-model";

/** Số bài chờ duyệt tối đa từ một địa chỉ IP — chống spam khi không cần đăng nhập */
const MAX_PENDING_PER_SUBMITTER = 10;
/** Tổng số bài chờ duyệt tối đa trên cả site — chặn spam tràn database */
const MAX_PENDING_TOTAL = 300;

export type Contribution = {
  title: string;
  artist: string;
  /** Tên người gửi (tuỳ chọn) — hiện là người soạn tab trên trang bài */
  name: string;
  collection: string;
  level: string;
  /** Tab tương tác: "@score:<track>;<base64>" (file Guitar Pro / tab tự soạn) hoặc alphaTex (đọc từ PDF) */
  notation: string;
  tempo: number | null;
  rights: boolean;
  /** Ô ẩn: người thật không thấy nên để trống; bot tự điền → bỏ qua */
  website?: string;
};

export type ContributionResult = { ok: true; title: string } | { ok: false; error: string };

/** IP người gửi, băm SHA-256 — không lưu IP gốc */
async function submitterHash() {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  return createHash("sha256").update(`solo-tab:${ip}`).digest("hex");
}

/** Ai cũng gửi được (không cần tài khoản): tab đã dựng sẵn trên trình duyệt → chờ admin duyệt */
export async function submitContribution(c: Contribution): Promise<ContributionResult> {
  const title = String(c?.title ?? "").trim();
  if (c?.website) return { ok: true, title }; // bot

  const artist = String(c.artist ?? "").trim();
  const name = String(c.name ?? "").trim().replace(/\s+/g, " ");
  if (!title || title.length > 200) return { ok: false, error: "Nhập tên bài (tối đa 200 ký tự)" };
  if (artist.length > 200) return { ok: false, error: "Tên ca sĩ / tác giả tối đa 200 ký tự" };
  if (name.length > 60) return { ok: false, error: "Tên của bạn tối đa 60 ký tự" };
  if (!Object.hasOwn(collections, c.collection)) return { ok: false, error: "Chọn kho bài" };
  if (!(LEVELS as readonly string[]).includes(c.level)) return { ok: false, error: "Chọn độ khó" };
  if (c.rights !== true) return { ok: false, error: "Bạn cần xác nhận mình tự soạn (hoặc được phép đăng) tab này" };

  const notation = typeof c.notation === "string" ? c.notation : "";
  const notationOk = isFileNotation(notation)
    ? isValidFileNotation(notation)
    : notation.length > 0 && notation.length <= NOTATION_MAX_CHARS && /\|/.test(notation);
  if (!notationOk) return { ok: false, error: "Dữ liệu tab không hợp lệ hoặc quá lớn" };
  const bpm = Number.isInteger(c.tempo) && c.tempo! >= 20 && c.tempo! <= 400 ? c.tempo : null;

  const who = await submitterHash();
  const [{ mine, total }] = await sql`
    select count(*) filter (where submitter_hash = ${who})::int as mine, count(*)::int as total
    from songs where status = 'pending'`;
  if (mine >= MAX_PENDING_PER_SUBMITTER) {
    return { ok: false, error: `Bạn đang có ${mine} bài chờ duyệt — đợi admin duyệt bớt rồi gửi tiếp nhé` };
  }
  if (total >= MAX_PENDING_TOTAL) {
    return { ok: false, error: "Đang có quá nhiều bài chờ duyệt — bạn quay lại sau ít hôm nhé" };
  }

  // Đường dẫn trùng với bài khác → thêm số: ten-bai-2, ten-bai-3…
  const base = slugify(title).slice(0, 80).replace(/-+$/, "") || "bai";
  for (let i = 1; i <= 50; i++) {
    const slug = i === 1 ? base : `${base}-${i}`;
    const rows = await sql`
      insert into songs (slug, title, artist, collection, level, bpm, notation, status,
                         contributor_name, submitter_hash, submitted_at)
      values (${slug}, ${title}, ${artist || null}, ${c.collection}, ${c.level}, ${bpm}, ${notation}, 'pending',
              ${name || null}, ${who}, now())
      on conflict (slug) do nothing
      returning slug`;
    if (rows.length) return { ok: true, title };
  }
  return { ok: false, error: "Không tạo được đường dẫn cho bài — thử đổi tên bài" };
}
