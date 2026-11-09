import { SiteShell } from "@/components/SiteShell";
import { NotFoundView } from "@/views/NotFoundView";

/** Đường dẫn không khớp trang nào (nằm ngoài layout từng ngôn ngữ) → tự kèm header / footer */
export default function NotFound() {
  return (
    <SiteShell lang="vi" switcher={false}>
      <NotFoundView lang="vi" />
    </SiteShell>
  );
}
