import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Đóng góp tab", template: "%s · Đóng góp" },
  description: "Gửi tab lên solo.tab, không cần tài khoản: tải file Guitar Pro / PDF lên hoặc tự soạn tab ngay trên trình duyệt.",
};

export default function ContributeLayout({ children }: LayoutProps<"/dong-gop">) {
  return <div className="mx-auto w-full max-w-5xl px-4 py-10">{children}</div>;
}
