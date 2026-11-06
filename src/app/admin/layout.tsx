import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Quản lý bài", template: "%s · Admin" },
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return <div className="mx-auto w-full max-w-5xl px-4 py-10">{children}</div>;
}
