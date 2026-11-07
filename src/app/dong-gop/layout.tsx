import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Đóng góp tab", template: "%s · Đóng góp" },
  description: "Đăng tab guitar bạn tự soạn lên solo.tab — tải file Guitar Pro, sheet PDF hoặc soạn ngay trên web.",
};

export default function ContributeLayout({ children }: LayoutProps<"/dong-gop">) {
  return <div className="mx-auto w-full max-w-5xl px-4 py-10">{children}</div>;
}
