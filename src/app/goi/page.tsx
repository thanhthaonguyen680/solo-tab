import type { Metadata } from "next";
import { formatVnd, site } from "@/config/site";
import { countSongs } from "@/lib/songs";

export const metadata: Metadata = { title: "Gói thành viên" };

const perks = [
  "Xem toàn bộ tab Solo & Melody",
  "Audio mẫu cho từng bài",
  "Bài mới cập nhật mỗi tuần",
  "Gửi yêu cầu bài bạn muốn tập",
];

export default function PricingPage() {
  return (
    <section className="mx-auto flex max-w-md flex-col gap-6 px-4 py-16">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Gói thành viên</h1>
        <p className="mt-2 text-muted">Một gói, mở toàn bộ {countSongs()} bài và mọi bài mới.</p>
      </div>

      <div className="rounded-2xl border border-accent/60 bg-surface p-6">
        <p className="font-mono text-sm text-muted">{site.name}</p>
        <p className="mt-1 text-4xl font-bold">
          {formatVnd(site.pricePerMonth)}
          <span className="text-base font-normal text-muted"> /tháng</span>
        </p>
        <ul className="mt-5 flex flex-col gap-2">
          {perks.map((p) => (
            <li key={p} className="flex gap-2">
              <span className="text-accent">✓</span>
              {p}
            </li>
          ))}
        </ul>
        {/* TODO: nối với đăng nhập + cổng thanh toán */}
        <button
          type="button"
          disabled
          className="mt-6 w-full cursor-not-allowed rounded-lg bg-accent/40 py-2.5 font-semibold text-accent-fg"
        >
          Sắp mở đăng ký
        </button>
      </div>

      <p className="text-center text-sm text-muted">
        Cần hỗ trợ?{" "}
        <a href={site.contact.href} className="text-accent hover:underline">
          {site.contact.label}
        </a>
      </p>
    </section>
  );
}
