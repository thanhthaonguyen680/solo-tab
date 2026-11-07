import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { buttonPrimary } from "@/components/buttons";
import { site } from "@/config/site";
import { googleConfig } from "@/lib/google-oauth";
import { getMember, safeNext } from "@/lib/member-auth";

export const metadata: Metadata = { title: "Đăng nhập", robots: { index: false } };

const ERRORS: Record<string, string> = {
  huy: "Bạn đã huỷ đăng nhập Google.",
  phien: "Phiên đăng nhập đã hết hạn — thử lại nhé.",
  google: "Google chưa xác nhận được tài khoản — thử lại sau ít phút.",
  "bi-khoa": "Tài khoản này đã bị khoá.",
  "chua-cau-hinh": "Đăng nhập Google chưa được bật trên site.",
};

export default async function LoginPage(props: PageProps<"/dang-nhap">) {
  const sp = await props.searchParams;
  const next = safeNext(typeof sp.next === "string" ? sp.next : null);
  if (await getMember()) redirect(next);
  const error = typeof sp.loi === "string" ? ERRORS[sp.loi] : undefined;
  const ready = Boolean(googleConfig());

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-16">
      <div>
        <p className="eyebrow">{site.name}</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">Đăng nhập</h1>
        <p className="mt-2 text-muted">Đăng nhập để gửi tab bạn tự soạn lên {site.name}.</p>
      </div>
      {error && (
        <p role="alert" className="rounded-xl border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-300">
          {error}
        </p>
      )}
      {ready ? (
        // Link thường (không prefetch): route handler chuyển thẳng sang Google
        <a href={`/dang-nhap/google?next=${encodeURIComponent(next)}`} className={`${buttonPrimary("lg")} gap-3`}>
          <GoogleIcon /> Đăng nhập bằng Google
        </a>
      ) : (
        <p className="rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted">
          Đăng nhập Google đang được thiết lập — quay lại sau nhé.
        </p>
      )}
      <p className="text-xs text-muted">
        {site.name} chỉ lấy tên, email và ảnh đại diện Google của bạn để hiện tên người soạn. Không đăng gì lên tài khoản của bạn.
      </p>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" width="20" height="20" aria-hidden className="rounded-sm bg-white p-0.5">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.9 6.2C12.5 13.6 17.8 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.8c4.3-4 6.9-9.9 6.9-17.2z" />
      <path fill="#FBBC05" d="M10.6 28.5c-.5-1.4-.8-2.9-.8-4.5s.3-3.1.8-4.5l-7.9-6.2C1 16.6 0 20.2 0 24s1 7.4 2.7 10.7l7.9-6.2z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.8c-2.1 1.4-4.8 2.3-8.5 2.3-6.2 0-11.5-4.1-13.4-9.8l-7.9 6.2C6.6 42.6 14.6 48 24 48z" />
    </svg>
  );
}
