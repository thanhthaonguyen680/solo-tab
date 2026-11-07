import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SongCard } from "@/components/SongCard";
import { site } from "@/config/site";
import { getSongs } from "@/lib/songs";

/** Bài đã đăng của một thành viên (lấy từ danh sách bài đã cache — không lộ email hay bài chưa duyệt) */
async function authorSongs(idParam: string) {
  const id = Number(idParam);
  if (!Number.isInteger(id) || id < 1) return null;
  const songs = (await getSongs()).filter((s) => s.authorId === id);
  return songs.length ? { name: songs[0].authorName ?? "Thành viên", songs } : null;
}

export async function generateMetadata(props: PageProps<"/tac-gia/[id]">): Promise<Metadata> {
  const author = await authorSongs((await props.params).id);
  return author ? { title: `Tab soạn bởi ${author.name}` } : {};
}

export default async function AuthorPage(props: PageProps<"/tac-gia/[id]">) {
  const author = await authorSongs((await props.params).id);
  if (!author) notFound();

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-12">
      <Link href="/" className="w-fit text-sm text-muted hover:text-text">
        ← {site.name}
      </Link>
      <div>
        <p className="eyebrow">Người soạn tab</p>
        <h1 className="mt-2 text-4xl sm:text-5xl">{author.name}</h1>
        <p className="mt-2 text-muted">{author.songs.length} bài đã đăng trên {site.name}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {author.songs.map((s) => (
          <SongCard key={s.slug} song={s} />
        ))}
      </div>
    </div>
  );
}
