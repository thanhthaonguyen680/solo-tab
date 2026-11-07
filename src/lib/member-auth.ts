import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { sql } from "./db";

/**
 * Phiên đăng nhập của thành viên (đăng nhập Google).
 * Cookie giữ token ngẫu nhiên; database chỉ lưu SHA-256 của token → lộ database cũng không dùng lại được phiên.
 * Mọi trang / server action / route của thành viên phải gọi getMember() hoặc requireMember() — không tin client.
 */

export const MEMBER_COOKIE = "solo_member";
const SESSION_DAYS = 30;

export type Member = { id: number; name: string; email: string; avatarUrl: string | null };

const hash = (token: string) => createHash("sha256").update(token).digest("hex");

/** Thành viên đang đăng nhập, hoặc null. Đọc cookie → phải nằm trong <Suspense> / loading.tsx. */
export async function getMember(): Promise<Member | null> {
  const token = (await cookies()).get(MEMBER_COOKIE)?.value;
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const rows = await sql`
    select u.id::int as id, u.name, u.email, u.avatar_url as "avatarUrl"
    from user_sessions s join users u on u.id = s.user_id
    where s.token_hash = ${hash(token)} and s.expires_at > now() and not u.is_banned`;
  return (rows[0] as Member | undefined) ?? null;
}

/** Bắt buộc đăng nhập; chưa đăng nhập thì chuyển tới trang đăng nhập rồi quay lại `next`. */
export async function requireMember(next = "/dong-gop"): Promise<Member> {
  const member = await getMember();
  if (!member) redirect(`/dang-nhap?next=${encodeURIComponent(next)}`);
  return member;
}

/** Tạo phiên mới sau khi Google xác nhận danh tính; trả về token để route handler đặt cookie. */
export async function createMemberSession(userId: number) {
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await sql`insert into user_sessions (token_hash, user_id, expires_at) values (${hash(token)}, ${userId}, ${expires})`;
  // Dọn phiên hết hạn của người này
  await sql`delete from user_sessions where user_id = ${userId} and expires_at < now()`;
  return { token, expires };
}

export const memberCookieOptions = (expires: Date) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  expires,
});

export async function endMemberSession() {
  const store = await cookies();
  const token = store.get(MEMBER_COOKIE)?.value;
  if (token) await sql`delete from user_sessions where token_hash = ${hash(token)}`;
  store.delete(MEMBER_COOKIE);
}

/** Chỉ cho phép quay về đường dẫn nội bộ (chặn open redirect kiểu "//evil.com") */
export function safeNext(next: string | null | undefined, fallback = "/dong-gop") {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : fallback;
}
