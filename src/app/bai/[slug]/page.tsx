import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AudioBadge, FreeBadge, NewBadge, Tag } from "@/components/Badges";
import { buttonPrimary } from "@/components/buttons";
import { TabPlayer } from "@/components/TabPlayer";
import { collections, formatVnd, site } from "@/config/site";
import { getNotation } from "@/data/notation";
import { canViewSong } from "@/lib/access";
import type { Sheet } from "@/lib/song-model";
import { allSongSlugs, getSong } from "@/lib/songs";

export async function generateStaticParams() {
  return (await allSongSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata(props: PageProps<"/bai/[slug]">): Promise<Metadata> {
  const song = await getSong((await props.params).slug);
  if (!song) return {};
  return { title: song.title, description: `Tab guitar ${song.title}${song.artist ? ` — ${song.artist}` : ""}` };
}

export default async function SongPage(props: PageProps<"/bai/[slug]">) {
  const song = await getSong((await props.params).slug);
  if (!song) notFound();

  const unlocked = canViewSong(song);
  // Chỉ gửi dữ liệu nốt xuống trình duyệt khi người xem có quyền
  const notation = unlocked ? await getNotation(song) : null;
  const collection = collections[song.collection];

  const meta = [
    ["Độ khó", song.level],
    ["Tông", song.key],
    ["Tempo", song.bpm && `${song.bpm} bpm`],
  ].filter((m): m is [string, string] => Boolean(m[1]));

  return (
    <article className={`mx-auto flex flex-col gap-6 px-4 py-10 ${song.sheet || notation ? "max-w-4xl" : "max-w-3xl"}`}>
      <Link href={`/${collection.slug}`} className="w-fit text-sm text-muted hover:text-text">
        ← {site.name} {collection.title}
      </Link>

      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-1">
          {site.membership && song.free && <FreeBadge />}
          {song.isNew && <NewBadge />}
          {song.hasAudio && <AudioBadge />}
        </div>
        <h1 className="text-4xl sm:text-5xl">{song.title}</h1>
        {song.artist && <p className="text-lg text-muted">{song.artist}</p>}
        {song.authorId && song.authorName && (
          <p className="text-sm text-muted">
            Soạn tab bởi{" "}
            <Link href={`/tac-gia/${song.authorId}`} className="font-semibold text-accent-ink underline-offset-4 hover:underline">
              {song.authorName}
            </Link>
          </p>
        )}
        <div className="flex flex-wrap gap-1">
          {song.tags.map((t) => (
            <Tag key={t}>{t}</Tag>
          ))}
        </div>
        <dl
          className="mt-2 grid divide-x divide-line rounded-xl border border-line bg-surface"
          style={{ gridTemplateColumns: `repeat(${meta.length}, minmax(0, 1fr))` }}
        >
          {meta.map(([label, value]) => (
            <div key={label} className="px-4 py-3">
              <dt className="text-xs font-semibold tracking-wide text-muted uppercase">{label}</dt>
              <dd className="mt-0.5 font-mono font-bold text-accent-ink">{value}</dd>
            </div>
          ))}
        </dl>
      </header>

      {unlocked ? (
        <section className="flex flex-col gap-4">
          {/* Có dữ liệu nốt → tab tương tác tự phát nhạc, thay cho file audio */}
          {notation ? (
            <TabPlayer notation={notation} defaultBpm={song.bpm} />
          ) : (
            song.audioUrl && (
              <div className="rounded-xl border border-accent/40 bg-fresh p-4">
                <p className="eyebrow mb-2">Audio mẫu</p>
                <audio controls preload="none" src={song.audioUrl} className="w-full" />
              </div>
            )
          )}
          {song.sheet &&
            (notation ? (
              // Đã có tab tương tác → sheet PDF chỉ là bản in tham khảo, thu gọn mặc định
              <details className="group mt-6 rounded-xl border border-line bg-surface">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-5 py-4 transition-colors hover:bg-surface-2 [&::-webkit-details-marker]:hidden">
                  <span className="flex items-baseline gap-2">
                    <span className="font-display text-xl font-semibold">Sheet PDF</span>
                    <span className="text-sm text-muted">· {song.sheet.pages.length} trang</span>
                  </span>
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-accent-ink">
                    <span className="group-open:hidden">Xem sheet</span>
                    <span className="hidden group-open:inline">Thu gọn</span>
                    <svg viewBox="0 0 16 16" className="size-4 transition-transform group-open:rotate-180" aria-hidden>
                      <path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="m4 6 4 4 4-4" />
                    </svg>
                  </span>
                </summary>
                <div className="px-3 pb-3 sm:px-4 sm:pb-4">
                  <SheetPages slug={song.slug} title={song.title} sheet={song.sheet} lazy />
                </div>
              </details>
            ) : (
              <SheetPages slug={song.slug} title={song.title} sheet={song.sheet} />
            ))}
          {/* Tab chữ: hiện thêm nếu có; nếu không có sheet / tab tương tác thì báo đang cập nhật */}
          {!notation && (song.tab || !song.sheet) && <TabBlock tab={song.tab} />}
        </section>
      ) : (
        <section className="relative overflow-hidden rounded-xl border border-border">
          {/* Không render tab thật khi bị khoá — blur bằng CSS vẫn lộ nội dung trong HTML */}
          <div aria-hidden className="pointer-events-none blur-[3px] select-none">
            {song.sheet ? <SheetPlaceholder /> : <TabBlock tab={LOCKED_PLACEHOLDER} />}
          </div>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-bg/80 p-6 text-center">
            <p className="font-display text-2xl font-semibold">Bài này dành cho thành viên</p>
            {song.sheet && (
              <p className="font-semibold">Sheet PDF {song.sheet.pages.length} trang</p>
            )}
            <p className="max-w-sm text-sm text-muted">
              Mở toàn bộ kho tab và audio mẫu với gói {formatVnd(site.pricePerMonth)}/tháng.
            </p>
            <Link
              href="/goi"
              className={buttonPrimary("lg")}
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
    <pre className="overflow-x-auto rounded-xl border border-line bg-surface p-5 font-mono text-sm leading-relaxed text-soft">
      {tab}
    </pre>
  );
}

/** Các trang sheet PDF (ảnh do server trả về sau khi kiểm tra quyền) phủ watermark. */
/** `lazy`: mọi trang tải khi cần (dùng khi sheet nằm trong khung thu gọn) */
function SheetPages({ slug, title, sheet, lazy = false }: { slug: string; title: string; sheet: Sheet; lazy?: boolean }) {
  return (
    <div className="flex flex-col gap-4">
      {sheet.pages.map((p, i) => (
        <figure
          key={i}
          className="relative overflow-hidden rounded-xl border border-line bg-white select-none"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- ảnh từ route có kiểm tra quyền, không qua tối ưu ảnh */}
          <img
            src={`/api/sheet/${slug}/${sheet.version}/${i + 1}`}
            width={p.width}
            height={p.height}
            alt={`${title} — trang ${i + 1}/${sheet.pages.length}`}
            loading={i === 0 && !lazy ? "eager" : "lazy"}
            decoding="async"
            draggable={false}
            className="block h-auto w-full"
          />
          {/* Lớp phủ watermark — cũng chặn chuột phải "Lưu ảnh" và kéo thả ảnh */}
          <div aria-hidden className="sheet-watermark absolute inset-0" />
        </figure>
      ))}
    </div>
  );
}

/** Trang giấy giả (không chứa nội dung thật) để làm nền mờ khi bài bị khoá */
function SheetPlaceholder() {
  return (
    <div className="aspect-[1/1.2] bg-white p-10">
      <div className="mx-auto mb-8 h-6 w-2/3 rounded bg-surface-2" />
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="sheet-staff mb-8 h-16" />
      ))}
    </div>
  );
}
