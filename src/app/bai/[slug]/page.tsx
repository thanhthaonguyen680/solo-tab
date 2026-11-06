import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AudioBadge, FreeBadge, NewBadge, Tag } from "@/components/Badges";
import { collections, formatVnd, site } from "@/config/site";
import { canViewSong } from "@/lib/access";
import { allSongSlugs, getSong } from "@/lib/songs";

export function generateStaticParams() {
  return allSongSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata(props: PageProps<"/bai/[slug]">): Promise<Metadata> {
  const song = getSong((await props.params).slug);
  if (!song) return {};
  return { title: song.title, description: `Tab guitar ${song.title}${song.artist ? ` — ${song.artist}` : ""}` };
}

export default async function SongPage(props: PageProps<"/bai/[slug]">) {
  const song = getSong((await props.params).slug);
  if (!song) notFound();

  const unlocked = canViewSong(song);
  const collection = collections[song.collection];

  const meta = [
    ["Độ khó", song.level],
    ["Tông", song.key],
    ["Tempo", song.bpm && `${song.bpm} bpm`],
  ].filter((m): m is [string, string] => Boolean(m[1]));

  return (
    <article className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-10">
      <Link href={`/${collection.slug}`} className="w-fit text-sm text-muted hover:text-text">
        ← {site.name} {collection.title}
      </Link>

      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-1">
          {song.free && <FreeBadge />}
          {song.isNew && <NewBadge />}
          {song.hasAudio && <AudioBadge />}
        </div>
        <h1 className="text-3xl font-bold sm:text-4xl">{song.title}</h1>
        {song.artist && <p className="text-muted">{song.artist}</p>}
        <div className="flex flex-wrap gap-1">
          {song.tags.map((t) => (
            <Tag key={t}>{t}</Tag>
          ))}
        </div>
        <dl
          className="mt-2 grid divide-x divide-border rounded-xl border border-border bg-surface"
          style={{ gridTemplateColumns: `repeat(${meta.length}, minmax(0, 1fr))` }}
        >
          {meta.map(([label, value]) => (
            <div key={label} className="px-4 py-3">
              <dt className="text-xs text-muted">{label}</dt>
              <dd className="font-mono font-semibold">{value}</dd>
            </div>
          ))}
        </dl>
      </header>

      {unlocked ? (
        <section className="flex flex-col gap-4">
          {song.audioUrl && (
            <div className="rounded-xl border border-border bg-surface p-4">
              <p className="mb-2 text-sm text-muted">Audio mẫu</p>
              <audio controls preload="none" src={song.audioUrl} className="w-full" />
            </div>
          )}
          <TabBlock tab={song.tab} />
        </section>
      ) : (
        <section className="relative overflow-hidden rounded-xl border border-border">
          {/* Không render tab thật khi bị khoá — blur bằng CSS vẫn lộ nội dung trong HTML */}
          <div aria-hidden className="pointer-events-none blur-[3px] select-none">
            <TabBlock tab={LOCKED_PLACEHOLDER} />
          </div>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-bg/70 p-6 text-center">
            <p className="text-lg font-semibold">Bài này dành cho thành viên</p>
            <p className="max-w-sm text-sm text-muted">
              Mở toàn bộ kho tab và audio mẫu với gói {formatVnd(site.pricePerMonth)}/tháng.
            </p>
            <Link
              href="/goi"
              className="rounded-lg bg-accent px-5 py-2.5 font-semibold text-accent-fg transition-opacity hover:opacity-90"
            >
              Xem gói thành viên
            </Link>
          </div>
        </section>
      )}
    </article>
  );
}

const LOCKED_PLACEHOLDER = ["e", "B", "G", "D", "A", "E"]
  .map((s) => `${s}|${"-x-x-x-x-".repeat(4)}|`)
  .join("\n");

function TabBlock({ tab }: { tab?: string }) {
  if (!tab) {
    return <p className="rounded-xl border border-dashed border-border p-8 text-center text-muted">Tab đang được cập nhật.</p>;
  }
  return (
    <pre className="overflow-x-auto rounded-xl border border-border bg-surface p-5 font-mono text-sm leading-relaxed">
      {tab}
    </pre>
  );
}
