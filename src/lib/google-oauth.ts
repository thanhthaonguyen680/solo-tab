import "server-only";
import { createHash, randomBytes } from "node:crypto";

/**
 * Đăng nhập Google theo chuẩn OAuth 2.0 / OpenID Connect (authorization code + PKCE).
 * Không cần thư viện: chỉ 2 bước — chuyển người dùng sang Google, rồi đổi `code` lấy id_token.
 * Cần GOOGLE_CLIENT_ID và GOOGLE_CLIENT_SECRET (tạo trong Google Cloud Console → Credentials).
 */

export const OAUTH_COOKIE = "solo_oauth";
export const CALLBACK_PATH = "/dang-nhap/google/callback";

export function googleConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}

export function newOAuthState() {
  const state = randomBytes(24).toString("base64url");
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { state, verifier, challenge };
}

export function authorizeUrl(clientId: string, redirectUri: string, state: string, challenge: string) {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
    prompt: "select_account",
  }).toString();
  return url.toString();
}

export type GoogleProfile = { sub: string; email: string; name: string; picture: string | null };

/**
 * Đổi `code` lấy id_token. id_token nhận trực tiếp từ máy chủ Google qua HTTPS (không qua trình duyệt)
 * nên theo OpenID Connect không cần kiểm chữ ký; vẫn kiểm iss / aud / hạn / email đã xác minh.
 */
export async function exchangeCode(code: string, verifier: string, redirectUri: string): Promise<GoogleProfile> {
  const cfg = googleConfig();
  if (!cfg) throw new Error("Chưa cấu hình đăng nhập Google");
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
      code_verifier: verifier,
    }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Google từ chối mã đăng nhập (${res.status})`);
  const { id_token } = (await res.json()) as { id_token?: string };
  const payload = id_token?.split(".")[1];
  if (!payload) throw new Error("Google không trả về id_token");
  const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Record<string, unknown>;

  const issOk = claims.iss === "https://accounts.google.com" || claims.iss === "accounts.google.com";
  if (!issOk || claims.aud !== cfg.clientId || typeof claims.exp !== "number" || claims.exp * 1000 < Date.now()) {
    throw new Error("id_token không hợp lệ");
  }
  if (typeof claims.sub !== "string" || typeof claims.email !== "string" || claims.email_verified !== true) {
    throw new Error("Tài khoản Google chưa xác minh email");
  }
  const name = typeof claims.name === "string" && claims.name.trim() ? claims.name.trim() : claims.email.split("@")[0];
  return {
    sub: claims.sub,
    email: claims.email,
    name: name.slice(0, 80),
    picture: typeof claims.picture === "string" && claims.picture.startsWith("https://") ? claims.picture : null,
  };
}
