import { SiteShell } from "@/components/SiteShell";

/** Site tiếng Việt — giữ nguyên đường dẫn cũ (/bai/…, /tac-gia/…) */
export default function VietnameseLayout({ children }: { children: React.ReactNode }) {
  return <SiteShell lang="vi">{children}</SiteShell>;
}
