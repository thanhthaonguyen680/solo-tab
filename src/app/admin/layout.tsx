import type { Metadata } from "next";
import { SiteShell } from "@/components/SiteShell";

export const metadata: Metadata = {
  title: { default: "Quản lý bài", template: "%s · Admin" },
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <SiteShell lang="vi" switcher={false}>
      <div className="mx-auto w-full max-w-5xl px-4 py-10">{children}</div>
    </SiteShell>
  );
}
