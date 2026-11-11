import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Đăng nhập" };

export default function AdminLoginPage() {
  return (
    <section className="mx-auto flex max-w-sm flex-col gap-6 py-10">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">
          Đăng nhập <span className="highlight">admin</span>
        </h1>
        <p className="mt-1 text-muted">Khu vực quản lý tab của SoloTab.</p>
      </div>
      <LoginForm />
    </section>
  );
}
