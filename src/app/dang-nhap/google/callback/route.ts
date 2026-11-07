import { NextResponse, type NextRequest } from "next/server";
import { sql } from "@/lib/db";
import { CALLBACK_PATH, exchangeCode, OAUTH_COOKIE } from "@/lib/google-oauth";
import { createMemberSession, MEMBER_COOKIE, memberCookieOptions, safeNext } from "@/lib/member-auth";

/** Bước 2: Google gọi lại với `code` → đổi lấy danh tính, tạo / cập nhật thành viên, mở phiên đăng nhập */
export async function GET(request: NextRequest) {
  const fail = (code: string, next = "/dong-gop") => {
    const res = NextResponse.redirect(new URL(`/dang-nhap?loi=${code}&next=${encodeURIComponent(next)}`, request.url));
    res.cookies.delete({ name: OAUTH_COOKIE, path: "/dang-nhap/google" });
    return res;
  };

  let saved: { state?: string; verifier?: string; next?: string } = {};
  try {
    saved = JSON.parse(Buffer.from(request.cookies.get(OAUTH_COOKIE)?.value ?? "", "base64url").toString("utf8") || "{}");
  } catch {
    saved = {};
  }
  const next = safeNext(saved.next);
  const params = request.nextUrl.searchParams;
  if (params.get("error")) return fail("huy", next);

  const code = params.get("code");
  const state = params.get("state");
  if (!code || !state || !saved.state || state !== saved.state || !saved.verifier) return fail("phien", next);

  try {
    const profile = await exchangeCode(code, saved.verifier, new URL(CALLBACK_PATH, request.url).toString());
    const [user] = await sql`
      insert into users (google_sub, email, name, avatar_url)
      values (${profile.sub}, ${profile.email}, ${profile.name}, ${profile.picture})
      on conflict (google_sub) do update
        set email = excluded.email, name = excluded.name, avatar_url = excluded.avatar_url, last_login_at = now()
      returning id::int as id, is_banned as "isBanned"`;
    if (user.isBanned) return fail("bi-khoa", next);

    const { token, expires } = await createMemberSession(user.id);
    const res = NextResponse.redirect(new URL(next, request.url));
    res.cookies.set(MEMBER_COOKIE, token, memberCookieOptions(expires));
    res.cookies.delete({ name: OAUTH_COOKIE, path: "/dang-nhap/google" });
    return res;
  } catch (err) {
    console.error("Đăng nhập Google:", err);
    return fail("google", next);
  }
}
