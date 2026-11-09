import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SongCard } from "@/components/SongCard";
import { site } from "@/config/site";
import { alternates, dict, paths, type Lang } from "@/i18n";
import { getSongs } from "@/lib/songs";

/** Bài đã đăng của một thành viên (lấy từ danh sách bài đã cache — không lộ email hay bài chưa duyệt) */
async function authorSongs(idParam: string) {
  const id = Number(idParam);
  if (!Number.isInteger(id) || id < 1) return null;
  const songs = (await getSongs()).filter((s) => s.authorId === id);
  return songs.length ? { id, name: songs[0].authorName, songs } : null;
}

export async function authorMetadata(lang: Lang, idParam: string): Promise<Metadata> {
  const author = await authorSongs(idParam);
  if (!author) return {};
  return {
    title: dict[lang].author.title(author.name ?? dict[lang].author.member),
    alternates: alternates(lang, paths.author("vi", author.id), paths.author("en", author.id)),
  };
}

export async function AuthorView({ lang, id }: { lang: Lang; id: string }) {
  const author = await authorSongs(id);
  if (!author) notFound();
  const t = dict[lang];

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-12">
      <Link href={paths.home(lang)} className="w-fit text-sm text-muted hover:text-text">
        ← {site.name}
      </Link>
      <div>
        <p className="eyebrow">{t.author.eyebrow}</p>
        <h1 className="mt-2 text-4xl sm:text-5xl">{author.name ?? t.author.member}</h1>
        <p className="mt-2 text-muted">{t.author.count(author.songs.length, site.name)}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {author.songs.map((s) => (
          <SongCard key={s.slug} song={s} lang={lang} />
        ))}
      </div>
    </div>
  );
}
