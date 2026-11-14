import { SiteShell } from "@/components/SiteShell";

/** Site tiếng Việt — bài ở /ten-bai, kho ở /solo, /melody, người soạn ở /tac-gia/… */
export default function VietnameseLayout({ children }: { children: React.ReactNode }) {
  return <SiteShell lang="vi">{children}</SiteShell>;
}
