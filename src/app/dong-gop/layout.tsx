import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Đóng góp tab", template: "%s · Đóng góp" },
  description: "Đẩy file PDF / Guitar Pro lên solo.tab — hệ thống tự dựng phần nhạc phát được.",
};

export default function ContributeLayout({ children }: LayoutProps<"/dong-gop">) {
  return <div className="mx-auto w-full max-w-5xl px-4 py-10">{children}</div>;
}
