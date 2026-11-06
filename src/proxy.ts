import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, verifyAdminToken } from "@/lib/admin-token";

/**
 * Chặn sớm /admin khi chưa đăng nhập. Chỉ kiểm tra chữ ký cookie (không gọi database).
 * Các trang và server action vẫn tự kiểm tra lại bằng requireAdmin().
 */
export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === "/admin/dang-nhap") return NextResponse.next();

  if (!(await verifyAdminToken(request.cookies.get(ADMIN_COOKIE)?.value))) {
    return NextResponse.redirect(new URL("/admin/dang-nhap", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
