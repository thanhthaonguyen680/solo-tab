import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/StatusBadge";
import { getAuthorForAdmin, getSongForAdmin } from "@/lib/admin-songs";
import { approveSong, deleteSong, rejectSong, saveSong, unpublishSong } from "../../actions";
import { buttonPrimary, buttonSecondary, inputClass } from "../../ui";
import { SongForm } from "../../SongForm";
import { DeleteSongButton } from "./DeleteSongButton";
import { isFileNotation } from "@/lib/notation-format";
import { SheetUploader } from "@/components/editor/SheetUploader";
import { TabEditorLauncher } from "@/components/editor/TabEditorLauncher";

export const metadata: Metadata = { title: "Sửa bài" };

export default async function EditSongPage(props: PageProps<"/admin/bai/[slug]">) {
  const { slug } = await props.params;
  const sp = await props.searchParams;
  const isNew = sp.moi === "1";
  const song = await getSongForAdmin(slug); // tự kiểm tra quyền admin
  if (!song) notFound();
  const author = song.authorId ? await getAuthorForAdmin(song.authorId) : undefined;
  const status = song.status ?? "published";

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
      {author && (
        <section className="flex flex-col gap-3 rounded-2xl border border-amber-400/40 bg-amber-400/5 p-5" aria-label="Duyệt bài">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm">
              Bài thành viên gửi: <b>{author.name}</b> <span className="text-muted">({author.email} · thành viên từ {author.since})</span>
            </p>
            <StatusBadge status={status} />
          </div>
          {sp["da-tra-ve"] === "1" && <p className="text-sm font-semibold text-accent-ink">✓ Đã trả bài về cho thành viên sửa.</p>}
          {status === "pending" || status === "rejected" || status === "draft" ? (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-muted">
                Nghe thử tab bằng nút “Sửa tab” bên dưới (có thể chỉnh luôn), kiểm tra thông tin bài, rồi duyệt hoặc trả về.
              </p>
              <div className="flex flex-wrap items-start gap-3">
                <form action={approveSong.bind(null, song.slug)}>
                  <button type="submit" className={buttonPrimary}>
                    ✓ Duyệt & đăng lên site
                  </button>
                </form>
                <form action={rejectSong.bind(null, song.slug)} className="flex min-w-[260px] flex-1 flex-col gap-2">
                  <textarea
                    name="note"
                    rows={2}
                    maxLength={1000}
                    defaultValue={song.reviewNote}
                    placeholder="Lời nhắn cho người gửi: cần sửa gì? (vd. ô 3 sai phách, thiếu tempo…)"
                    className={`${inputClass} h-auto py-2`}
                  />
                  <button type="submit" className={`${buttonSecondary} w-fit`}>
                    Trả về cho sửa
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <form action={unpublishSong.bind(null, song.slug)}>
              <button type="submit" className={buttonSecondary}>
                Gỡ khỏi site (về chờ duyệt)
              </button>
            </form>
          )}
        </section>
      )}
      {isNew && (
        <p role="status" className="rounded-xl border border-accent/40 bg-fresh px-4 py-3 text-sm font-semibold text-accent-ink">
          ✓ Đã tạo bài. Giờ tải sheet PDF / file Guitar Pro (.gp5…) lên, hoặc bấm “Tạo tab mới” để tự soạn tab ở khung bên dưới.
        </p>
      )}
      <SheetUploader
        slug={song.slug}
        sheet={song.sheet}
        notationSource={song.notation ? (isFileNotation(song.notation) ? "file" : "pdf") : null}
      />
      <TabEditorLauncher
        key={song.notation?.length ?? 0}
        slug={song.slug}
        title={song.title}
        notation={song.notation ?? null}
        defaultBpm={song.bpm}
      />
      <SongForm song={song} today={song.addedAt} action={saveSong.bind(null, song.slug)} />
    </div>
  );
}
