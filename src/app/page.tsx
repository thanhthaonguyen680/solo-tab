import Link from "next/link";
import { buttonPrimary, buttonSecondary } from "@/components/buttons";
import { SongCard } from "@/components/SongCard";
import { collections, formatVnd, site } from "@/config/site";
import { getSongs } from "@/lib/songs";

export default async function Home() {
  const all = await getSongs();
  const latest = all.slice(0, 6);
  const total = all.length;
  const countIn = (slug: string) => all.filter((s) => s.collection === slug).length;

  return (
    <>
      <section className="strings border-b border-line">
        <div className="mx-auto flex max-w-5xl flex-col items-start gap-6 px-4 py-20 sm:py-28">
          <Link
            href="/solo"
            className="group inline-flex items-center gap-2 rounded-full border border-accent/40 bg-fresh/60 py-1 pr-3 pl-1 text-sm text-accent-ink transition-colors hover:border-accent"
          >
            <span className="rounded-full border border-accent/40 px-2 py-0.5 font-semibold">{total} bài</span>
            Cập nhật mỗi tuần
            <span className="transition-transform group-hover:translate-x-0.5">→</span>
          </Link>
          <h1 className="max-w-3xl text-5xl leading-[1.08] sm:text-6xl">
            Tab guitar solo & melody, đọc là chơi được.
          </h1>
          <p className="max-w-xl text-lg leading-relaxed text-muted sm:text-xl">
            Mỗi bài có tab rõ ràng, độ khó, tông, tempo và audio mẫu để nghe trước khi tập.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link href="/solo" className={buttonPrimary("lg")}>
              Xem kho bài
            </Link>
            {site.membership ? (
              <Link href="/goi" className={buttonSecondary("lg")}>
                {formatVnd(site.pricePerMonth)}/tháng
              </Link>
            ) : (
              <Link href="/melody" className={buttonSecondary("lg")}>
                Kho Melody
              </Link>
            )}
          </div>
        </div>
      </section>

      <section className="border-b border-line bg-surface">
        <div className="mx-auto max-w-5xl px-4 py-16">
          <p className="eyebrow">Kho bài</p>
          <h2 className="mt-3 max-w-2xl text-3xl sm:text-4xl">Chọn kiểu bạn muốn tập</h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            {Object.values(collections).map((c, i) => (
              <Link
                key={c.slug}
                href={`/${c.slug}`}
                className="group flex flex-col gap-3 rounded-2xl border border-border bg-bg p-6 transition-colors hover:border-accent/60"
              >
                <div className="flex items-center justify-between">
                  <span className="grid size-11 place-items-center rounded-full bg-accent font-display font-bold text-accent-fg">
                    0{i + 1}
                  </span>
                  <span className="font-mono text-sm text-muted">{countIn(c.slug)} bài</span>
                </div>
                <h3 className="mt-2 font-display text-2xl font-semibold tracking-tight">{c.title}</h3>
                <p className="text-muted">{c.blurb}</p>
                <span className="mt-1 text-sm font-semibold text-accent-ink">
                  Mở kho {c.title}{" "}
                  <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-16">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow">Mới cập nhật</p>
            <h2 className="mt-3 text-3xl sm:text-4xl">Bài vừa thêm</h2>
          </div>
          <Link href="/solo" className="text-sm font-semibold text-accent-ink hover:underline">
            Xem tất cả →
          </Link>
        </div>
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {latest.map((s) => (
            <SongCard key={s.slug} song={s} />
          ))}
        </div>
      </section>
    </>
  );
}
