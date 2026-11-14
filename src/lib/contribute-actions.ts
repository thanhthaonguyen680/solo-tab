"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import type { Lang } from "@/i18n";
import { sql } from "@/lib/db";
import { isFileNotation, isValidFileNotation } from "@/lib/notation-format";
import { LEVELS, NOTATION_MAX_CHARS, RESERVED_SLUGS, slugify } from "@/lib/song-model";
import { refreshPublicPages } from "@/lib/song-access";

/** Số bài tối đa một địa chỉ IP được đăng trong 24 giờ — chống spam khi không cần đăng nhập */
const MAX_PER_SUBMITTER_PER_DAY = 10;
/** Tổng số bài đóng góp tối đa trên cả site trong 24 giờ — chặn spam tràn trang */
const MAX_TOTAL_PER_DAY = 100;

export type Contribution = {
  title: string;
  artist: string;
  /** Tên người gửi (tuỳ chọn) — hiện là người soạn tab trên trang bài */
  name: string;
  level: string;
  /** Tab tương tác: "@score:<track>;<base64>" (file Guitar Pro / tab tự soạn) hoặc alphaTex (đọc từ PDF) */
  notation: string;
  tempo: number | null;
  rights: boolean;
  /** Ô ẩn: người thật không thấy nên để trống; bot tự điền → bỏ qua */
  website?: string;
};

export type ContributionResult = { ok: true; title: string; slug: string } | { ok: false; error: string };

const ERRORS = {
  vi: {
    title: "Nhập tên bài (tối đa 200 ký tự)",
    artist: "Tên ca sĩ / tác giả tối đa 200 ký tự",
    name: "Tên của bạn tối đa 60 ký tự",
    level: "Chọn độ khó",
    rights: "Bạn cần xác nhận mình tự soạn (hoặc được phép đăng) tab này",
    notation: "Dữ liệu tab không hợp lệ hoặc quá lớn",
    tooManyMine: (n: number) => `You have published ${n} tabs in the last 24 hours — please come back tomorrow to post more`,
    tooManyTotal: "The site has received a lot of tabs today — please try again later",
    slug: "Không tạo được đường dẫn cho bài — thử đổi tên bài",
  },
  en: {
    title: "Enter a song title (up to 200 characters)",
    artist: "Artist name can be up to 200 characters",
    name: "Your name can be up to 60 characters",
    level: "Choose a level",
    rights: "Please confirm you arranged this tab yourself (or have permission to post it)",
    notation: "The tab data is invalid or too large",
    tooManyMine: (n: number) => `You already have ${n} tabs waiting for review — please wait until a few are reviewed before sending more`,
    tooManyTotal: "There are a lot of tabs waiting for review right now — please come back in a few days",
    slug: "Couldn't create a link for this song — try a different title",
  },
} satisfies Record<Lang, unknown>;

/** IP người gửi, băm SHA-256 — không lưu IP gốc */
async function submitterHash() {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  return createHash("sha256").update(`solo-tab:${ip}`).digest("hex");
}

/** Ai cũng gửi được (không cần tài khoản): tab đã dựng sẵn trên trình duyệt → đăng lên site ngay (admin vẫn gỡ / sửa được) */
export async function submitContribution(c: Contribution, lang: Lang = "vi"): Promise<ContributionResult> {
  const t = ERRORS[lang === "en" ? "en" : "vi"];
  const title = String(c?.title ?? "").trim();
  if (c?.website) return { ok: true, title, slug: "" }; // bot: giả như thành công, không lưu gì

  const artist = String(c.artist ?? "").trim();
  const name = String(c.name ?? "").trim().replace(/\s+/g, " ");
  if (!title || title.length > 200) return { ok: false, error: t.title };
  if (artist.length > 200) return { ok: false, error: t.artist };
  if (name.length > 60) return { ok: false, error: t.name };
  if (!(LEVELS as readonly string[]).includes(c.level)) return { ok: false, error: t.level };
  if (c.rights !== true) return { ok: false, error: t.rights };

  const notation = typeof c.notation === "string" ? c.notation : "";
  const notationOk = isFileNotation(notation)
    ? isValidFileNotation(notation)
    : notation.length > 0 && notation.length <= NOTATION_MAX_CHARS && /\|/.test(notation);
  if (!notationOk) return { ok: false, error: t.notation };
  const bpm = Number.isInteger(c.tempo) && c.tempo! >= 20 && c.tempo! <= 400 ? c.tempo : null;

  const who = await submitterHash();
  const [{ mine, total }] = await sql`
    select count(*) filter (where submitter_hash = ${who})::int as mine, count(*)::int as total
    from songs where submitted_at > now() - interval '24 hours'`;
  if (mine >= MAX_PER_SUBMITTER_PER_DAY) {
    return { ok: false, error: t.tooManyMine(mine) };
  }
  if (total >= MAX_TOTAL_PER_DAY) {
    return { ok: false, error: t.tooManyTotal };
  }

  // Đường dẫn trùng với bài khác → thêm số: ten-bai-2, ten-bai-3…
  const slugged = slugify(title).slice(0, 80).replace(/-+$/, "");
  // Tên bài trùng tên một trang có sẵn (vd. "Solo") → thêm "-tab" để link bài không đè trang đó
  const base = !slugged ? "bai-hat" : RESERVED_SLUGS.has(slugged) ? `${slugged}-tab` : slugged;
  for (let i = 1; i <= 50; i++) {
    const slug = i === 1 ? base : `${base}-${i}`;
    const rows = await sql`
      insert into songs (slug, title, artist, collection, level, bpm, notation, status,
                         contributor_name, submitter_hash, submitted_at)
      values (${slug}, ${title}, ${artist || null}, 'solo', ${c.level}, ${bpm}, ${notation}, 'published',
              ${name || null}, ${who}, now())
      on conflict (slug) do nothing
      returning slug`;
    if (rows.length) {
      refreshPublicPages(slug); // danh sách bài + trang bài hiện bài mới ngay
      return { ok: true, title, slug };
    }
  }
  return { ok: false, error: t.slug };
}
