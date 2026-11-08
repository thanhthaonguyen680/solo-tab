import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { site } from "@/config/site";
import { getMember, safeNext } from "@/lib/member-auth";
import { AuthForms } from "./AuthForms";

export const metadata: Metadata = { title: "Đăng nhập", robots: { index: false } };

export default async function LoginPage(props: PageProps<"/dang-nhap">) {
  const sp = await props.searchParams;
  const next = safeNext(sp.next);
  if (await getMember()) redirect(next);

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-14">
      <div>
        <p className="eyebrow">{site.name}</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">Đóng góp tab</h1>
        <p className="mt-2 text-muted">
          Đăng nhập hoặc tạo tài khoản để đẩy file PDF / Guitar Pro lên {site.name} — hệ thống tự dựng phần nhạc phát được.
        </p>
      </div>
      <AuthForms next={next} initialMode={sp.dang === "ky" ? "register" : "login"} />
    </div>
  );
}
