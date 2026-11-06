import "server-only";
import { scrypt, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { ADMIN_COOKIE, createAdminToken, verifyAdminToken } from "./admin-token";

/**
 * Data Access Layer cho admin: mọi trang và server action trong /admin phải gọi
 * requireAdmin() — proxy.ts chỉ là lớp chặn sớm, không đủ để bảo vệ dữ liệu.
 */
export async function isAdmin() {
  // So sánh với giờ hiện tại → phải chạy lúc request, không prerender
  await connection();
  return verifyAdminToken((await cookies()).get(ADMIN_COOKIE)?.value);
}

export async function requireAdmin() {
  if (!(await isAdmin())) redirect("/admin/dang-nhap");
}

function scryptAsync(password: string, salt: Buffer, keylen: number) {
  return new Promise<Buffer>((resolve, reject) =>
    scrypt(password, salt, keylen, (err, key) => (err ? reject(err) : resolve(key))),
  );
}

/** ADMIN_PASSWORD_HASH có dạng "scrypt:<salt hex>:<hash hex>" — tạo bằng `npm run admin:password` */
export async function checkAdminPassword(password: string) {
  const stored = process.env.ADMIN_PASSWORD_HASH ?? "";
  const [algo, saltHex, hashHex] = stored.split(":");
  if (algo !== "scrypt" || !saltHex || !hashHex) {
    throw new Error("Chưa đặt mật khẩu admin — chạy `npm run admin:password`");
  }
  const expected = Buffer.from(hashHex, "hex");
  const actual = await scryptAsync(password, Buffer.from(saltHex, "hex"), expected.length);
  return timingSafeEqual(actual, expected);
}

export async function startAdminSession() {
  const { token, expires } = await createAdminToken();
  (await cookies()).set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires,
  });
}

export async function endAdminSession() {
  (await cookies()).delete(ADMIN_COOKIE);
}
