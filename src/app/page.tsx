import Link from "next/link";
import { SongCard } from "@/components/SongCard";
import { collections, formatVnd, site } from "@/config/site";
import { countSongs, getLatestSongs } from "@/lib/songs";

export default function Home() {
  const latest = getLatestSongs(6);
  const total = countSongs();

  return (
    <>
      <section className="strings border-b border-border">
        <div className="mx-auto flex max-w-5xl flex-col items-start gap-6 px-4 py-16 sm:py-24">
          <span className="rounded-full border border-border bg-bg px-3 py-1 font-mono text-xs text-muted">
            {total} bài · cập nhật mỗi tuần
          </span>
          <h1 className="max-w-2xl text-4xl leading-tight font-bold tracking-tight sm:text-5xl">
            Tab guitar <span className="text-accent">solo</span> & <span className="text-accent">melody</span>,
            đọc là chơi được.
          </h1>
          <p className="max-w-xl text-lg text-muted">
            Mỗi bài có tab rõ ràng, độ khó, tông, tempo và audio mẫu để nghe trước khi tập.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/solo"
              className="rounded-lg bg-accent px-5 py-2.5 font-semibold text-accent-fg transition-opacity hover:opacity-90"
            >
              Xem kho bài
            </Link>
            <Link
              href="/goi"
              className="rounded-lg border border-border bg-bg px-5 py-2.5 font-semibold transition-colors hover:border-accent"
            >
              {formatVnd(site.pricePerMonth)}/tháng
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-12">
        <div className="grid gap-4 sm:grid-cols-2">
          {Object.values(collections).map((c, i) => (
            <Link
              key={c.slug}
              href={`/${c.slug}`}
              className="group flex flex-col gap-2 rounded-2xl border border-border bg-surface p-6 transition-colors hover:border-accent/60"
            >
              <span className="font-mono text-xs text-muted">0{i + 1}</span>
              <div className="flex items-baseline justify-between">
                <h2 className="text-2xl font-bold">{c.title}</h2>
                <span className="font-mono text-sm text-accent">{countSongs(c.slug)} bài</span>
              </div>
              <p className="text-muted">{c.blurb}</p>
              <span className="mt-2 text-sm font-semibold text-accent">
                Mở kho {c.title}{" "}
                <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-16">
        <h2 className="mb-4 text-xl font-bold">Mới cập nhật</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {latest.map((s) => (
            <SongCard key={s.slug} song={s} />
          ))}
        </div>
      </section>
    </>
  );
}
