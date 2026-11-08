import "server-only";
import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { sql } from "./db";

/**
 * Tài khoản thành viên: tên đăng nhập + mật khẩu (không cần email).
 * Mật khẩu lưu dạng scrypt có salt. Phiên đăng nhập: cookie giữ token ngẫu nhiên, database chỉ lưu
 * SHA-256 của token → lộ database cũng không dùng lại được phiên.
 * Mọi trang / server action / route của thành viên phải gọi getMember() hoặc requireMember() — không tin client.
 */

export const MEMBER_COOKIE = "solo_member";
const SESSION_DAYS = 30;

export type Member = { id: number; name: string };

export const USERNAME_PATTERN = /^[a-z0-9._]{3,30}$/;
export const PASSWORD_MIN = 6;

const sha256 = (token: string) => createHash("sha256").update(token).digest("hex");

function scryptAsync(password: string, salt: Buffer, keylen: number) {
  return new Promise<Buffer>((resolve, reject) =>
    scrypt(password, salt, keylen, (err, key) => (err ? reject(err) : resolve(key))),
  );
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password, salt, 64);
  return `scrypt:${salt.toString("hex")}:${hash.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [algo, saltHex, hashHex] = stored.split(":");
  if (algo !== "scrypt" || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = await scryptAsync(password, Buffer.from(saltHex, "hex"), expected.length);
  return timingSafeEqual(actual, expected);
}

/** Thành viên đang đăng nhập, hoặc null. Đọc cookie → phải nằm trong <Suspense> / loading.tsx. */
export async function getMember(): Promise<Member | null> {
  const token = (await cookies()).get(MEMBER_COOKIE)?.value;
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const rows = await sql`
    select u.id::int as id, u.username as name
    from user_sessions s join users u on u.id = s.user_id
    where s.token_hash = ${sha256(token)} and s.expires_at > now() and not u.is_banned`;
  return (rows[0] as Member | undefined) ?? null;
}

/** Bắt buộc đăng nhập; chưa đăng nhập thì chuyển tới trang đăng nhập / đăng ký rồi quay lại `next`. */
export async function requireMember(next = "/dong-gop"): Promise<Member> {
  const member = await getMember();
  if (!member) redirect(`/dang-nhap?next=${encodeURIComponent(next)}`);
  return member;
}

/** Mở phiên đăng nhập (gọi trong server action sau khi kiểm tra mật khẩu / tạo tài khoản) */
export async function startMemberSession(userId: number) {
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await sql`insert into user_sessions (token_hash, user_id, expires_at) values (${sha256(token)}, ${userId}, ${expires})`;
  // Dọn phiên hết hạn của người này
  await sql`delete from user_sessions where user_id = ${userId} and expires_at < now()`;
  (await cookies()).set(MEMBER_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires,
  });
}

export async function endMemberSession() {
  const store = await cookies();
  const token = store.get(MEMBER_COOKIE)?.value;
  if (token) await sql`delete from user_sessions where token_hash = ${sha256(token)}`;
  store.delete(MEMBER_COOKIE);
}

/** Chỉ cho phép quay về đường dẫn nội bộ (chặn open redirect kiểu "//evil.com") */
export function safeNext(next: unknown, fallback = "/dong-gop") {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\")
    ? next
    : fallback;
}
