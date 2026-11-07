import { NextResponse, type NextRequest } from "next/server";
import { authorizeUrl, CALLBACK_PATH, googleConfig, newOAuthState, OAUTH_COOKIE } from "@/lib/google-oauth";
import { safeNext } from "@/lib/member-auth";

/** Bước 1: chuyển người dùng sang trang chọn tài khoản Google */
export function GET(request: NextRequest) {
  const next = safeNext(request.nextUrl.searchParams.get("next"));
  const cfg = googleConfig();
  if (!cfg) {
    return NextResponse.redirect(new URL(`/dang-nhap?loi=chua-cau-hinh&next=${encodeURIComponent(next)}`, request.url));
  }
  const { state, verifier, challenge } = newOAuthState();
  const redirectUri = new URL(CALLBACK_PATH, request.url).toString();
  const res = NextResponse.redirect(authorizeUrl(cfg.clientId, redirectUri, state, challenge));
  // Giữ state + PKCE verifier 10 phút để đối chiếu khi Google gọi lại
  res.cookies.set(OAUTH_COOKIE, Buffer.from(JSON.stringify({ state, verifier, next })).toString("base64url"), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/dang-nhap/google",
    maxAge: 600,
  });
  return res;
}
