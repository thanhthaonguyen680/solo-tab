import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SheetUploader } from "@/components/editor/SheetUploader";
import { TabEditorLauncher } from "@/components/editor/TabEditorLauncher";
import { buttonPrimary, buttonSecondary } from "@/components/buttons";
import { StatusBadge } from "@/components/StatusBadge";
import { requireMember } from "@/lib/member-auth";
import { getMySong } from "@/lib/member-songs";
import { isFileNotation } from "@/lib/notation-format";
import { deleteSubmission, submitForReview, updateSubmission, withdrawSubmission } from "../actions";
import { MemberSongForm } from "../MemberSongForm";
import { DeleteSongButton } from "@/app/admin/bai/[slug]/DeleteSongButton";

export const metadata: Metadata = { title: "Bài của tôi" };

export default async function MySubmissionPage(props: PageProps<"/dong-gop/[slug]">) {
  const { slug } = await props.params;
  const member = await requireMember(`/dong-gop/${slug}`);
  const song = await getMySong(member, slug);
  if (!song) notFound();
  const sp = await props.searchParams;
  const status = song.status ?? "draft";
  const hasTab = Boolean(song.notation || song.sheet);
  const editable = status !== "published";

  return (
    <div className="flex flex-col gap-6">
      <Link href="/dong-gop" className="w-fit text-sm text-muted hover:text-text">
        ← Tab của tôi
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{song.title}</h1>
          {song.artist && <p className="text-muted">{song.artist}</p>}
        </div>
        <StatusBadge status={status} />
      </div>

      {sp.moi === "1" && (
        <p role="status" className="rounded-xl border border-accent/40 bg-fresh px-4 py-3 text-sm font-semibold text-accent-ink">
          ✓ Đã tạo bài. Bước 2/2: thêm tab bên dưới — tải file Guitar Pro / sheet PDF, hoặc bấm “Tạo tab mới” để tự soạn.
        </p>
      )}

      {/* Trạng thái + gửi duyệt */}
      <section className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5" aria-label="Trạng thái bài">
        {status === "draft" && (
          <>
            <p className="text-soft">
              Bài đang là <b>nháp</b> — chỉ bạn thấy. Thêm tab rồi bấm <b>Gửi duyệt</b>; admin xem xong sẽ đăng lên site.
            </p>
            <SubmitButton slug={song.slug} hasTab={hasTab} label="Gửi duyệt" />
          </>
        )}
        {status === "rejected" && (
          <>
            <p className="text-soft">Admin đã trả bài về để bạn sửa thêm.</p>
            {song.reviewNote && (
              <blockquote className="rounded-xl border-l-4 border-red-400 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                <span className="font-semibold">Lời nhắn của admin:</span> {song.reviewNote}
              </blockquote>
            )}
            <SubmitButton slug={song.slug} hasTab={hasTab} label="Gửi duyệt lại" />
          </>
        )}
        {status === "pending" && (
          <>
            <p className="text-soft">
              {sp["da-gui"] === "1" ? "✓ Đã gửi! " : ""}Bài đang <b>chờ duyệt</b>. Bạn vẫn sửa được tab trong lúc chờ.
            </p>
            <form action={withdrawSubmission.bind(null, song.slug)}>
              <button type="submit" className={buttonSecondary()}>
                Rút về nháp
              </button>
            </form>
          </>
        )}
        {status === "published" && (
          <p className="text-soft">
            🎉 Bài đã được đăng.{" "}
            <Link href={`/bai/${song.slug}`} className="font-semibold text-accent-ink underline underline-offset-4">
              Xem trên site →
            </Link>{" "}
            Muốn sửa bài đã đăng, hãy liên hệ admin.
          </p>
        )}
        {sp.loi === "chua-co-tab" && (
          <p role="alert" className="text-sm font-semibold text-red-300">
            Chưa gửi được: bài cần có tab tương tác hoặc sheet PDF.
          </p>
        )}
      </section>

      {editable && (
        <>
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
          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-semibold">Thông tin bài</h2>
            <MemberSongForm song={song} action={updateSubmission.bind(null, song.slug)} />
          </section>
          <DeleteSongButton title={song.title} action={deleteSubmission.bind(null, song.slug)} />
        </>
      )}
    </div>
  );
}

function SubmitButton({ slug, hasTab, label }: { slug: string; hasTab: boolean; label: string }) {
  return (
    <form action={submitForReview.bind(null, slug)} className="flex flex-wrap items-center gap-3">
      <button type="submit" disabled={!hasTab} className={buttonPrimary()}>
        {label}
      </button>
      {!hasTab && <span className="text-sm text-muted">Cần thêm tab tương tác hoặc sheet PDF trước.</span>}
    </form>
  );
}
