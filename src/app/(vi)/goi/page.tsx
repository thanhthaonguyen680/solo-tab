import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { formatVnd, site } from "@/config/site";
import { countSongs } from "@/lib/songs";

export const metadata: Metadata = { title: "Gói thành viên" };

const perks = [
  "Xem toàn bộ tab Solo & Melody",
  "Audio mẫu cho từng bài",
  "Bài mới cập nhật mỗi tuần",
  "Gửi yêu cầu bài bạn muốn tập",
];

export default async function PricingPage() {
  if (!site.membership) notFound(); // gói thành viên đang tắt
  const total = await countSongs();
  return (
    <section className="mx-auto flex max-w-md flex-col gap-6 px-4 py-16">
      <div className="text-center">
        <h1 className="text-4xl">Gói <span className="highlight">thành viên</span></h1>
        <p className="mt-2 text-muted">Một gói, mở toàn bộ {total} bài và mọi bài mới.</p>
      </div>

      <div className="rounded-2xl border border-accent/40 bg-surface p-6 glow">
        <p className="w-fit rounded-full bg-accent px-2.5 py-0.5 text-xs font-bold text-accent-fg">{site.name}</p>
        <p className="mt-3 font-display text-5xl font-semibold tracking-tight">
          {formatVnd(site.pricePerMonth)}
          <span className="text-base font-normal text-muted"> /tháng</span>
        </p>
        <ul className="mt-5 flex flex-col gap-2">
          {perks.map((p) => (
            <li key={p} className="flex gap-2">
              <span className="grid size-5 shrink-0 place-items-center rounded-full bg-accent text-xs font-bold text-accent-fg">✓</span>
              {p}
            </li>
          ))}
        </ul>
        {/* TODO: nối với đăng nhập + cổng thanh toán */}
        <button
          type="button"
          disabled
          className="mt-6 w-full cursor-not-allowed rounded-lg border border-dashed border-border bg-surface-2 py-3 font-semibold text-muted"
        >
          Sắp mở đăng ký
        </button>
      </div>

      <p className="text-center text-sm text-muted">
        Cần hỗ trợ?{" "}
        <a href={site.contact.href} className="font-semibold text-accent-ink underline-offset-4 hover:underline">
          {site.contact.label}
        </a>
      </p>
    </section>
  );
}
