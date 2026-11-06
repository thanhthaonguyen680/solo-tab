/**
 * Token phiên admin: "<hết hạn (ms)>.<chữ ký HMAC-SHA256>".
 * Chỉ dùng Web Crypto nên chạy được cả trong proxy.ts lẫn server component.
 */

export const ADMIN_COOKIE = "solo_admin";
export const ADMIN_SESSION_DAYS = 7;

const encoder = new TextEncoder();

function getSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("Thiếu ADMIN_SESSION_SECRET (tối thiểu 32 ký tự) — chạy `npm run admin:password`");
  }
  return secret;
}

async function sign(payload: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(`admin:${payload}`));
  return Buffer.from(sig).toString("base64url");
}

/** So sánh không lộ thời gian */
function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function createAdminToken(now = Date.now()) {
  const expires = now + ADMIN_SESSION_DAYS * 24 * 60 * 60 * 1000;
  return { token: `${expires}.${await sign(String(expires))}`, expires: new Date(expires) };
}

export async function verifyAdminToken(token: string | undefined, now = Date.now()): Promise<boolean> {
  if (!token) return false;
  const [expires, sig] = token.split(".");
  if (!expires || !sig || !/^\d+$/.test(expires) || Number(expires) < now) return false;
  return safeEqual(sig, await sign(expires));
}
