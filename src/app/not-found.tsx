import Link from "next/link";
import { buttonPrimary } from "@/components/buttons";

export default function NotFound() {
  return (
    <section className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-24 text-center">
      <pre className="font-mono text-sm text-muted">{"e|---4---0---4---|\nB|---------------|"}</pre>
      <h1 className="text-3xl">Lạc nhịp rồi — không tìm thấy trang</h1>
      <Link href="/" className={buttonPrimary("lg")}>
        Về trang chủ
      </Link>
    </section>
  );
}
