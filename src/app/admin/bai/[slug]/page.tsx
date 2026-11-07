import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSongForAdmin } from "@/lib/admin-songs";
import { deleteSong, saveSong } from "../../actions";
import { SongForm } from "../../SongForm";
import { DeleteSongButton } from "./DeleteSongButton";
import { isFileNotation } from "@/lib/notation-format";
import { SheetUploader } from "./SheetUploader";

export const metadata: Metadata = { title: "Sửa bài" };

export default async function EditSongPage(props: PageProps<"/admin/bai/[slug]">) {
  const { slug } = await props.params;
  const isNew = (await props.searchParams).moi === "1";
  const song = await getSongForAdmin(slug); // tự kiểm tra quyền admin
  if (!song) notFound();

  return (
    <div className="flex flex-col gap-6">
      <Link href="/admin" className="w-fit text-sm text-muted hover:text-text">
        ← Danh sách bài
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{song.title}</h1>
          <Link href={`/bai/${song.slug}`} className="text-sm font-semibold text-accent-ink underline-offset-4 hover:underline">
            Xem trên site →
          </Link>
        </div>
        <DeleteSongButton title={song.title} action={deleteSong.bind(null, song.slug)} />
      </div>
      {isNew && (
        <p role="status" className="rounded-xl border border-accent/40 bg-fresh px-4 py-3 text-sm font-semibold text-accent-ink">
          ✓ Đã tạo bài. Giờ tải sheet PDF hoặc file Guitar Pro (.gp5…) lên ở khung bên dưới.
        </p>
      )}
      <SheetUploader
        slug={song.slug}
        sheet={song.sheet}
        notationSource={song.notation ? (isFileNotation(song.notation) ? "file" : "pdf") : null}
      />
      <SongForm song={song} today={song.addedAt} action={saveSong.bind(null, song.slug)} />
    </div>
  );
}
