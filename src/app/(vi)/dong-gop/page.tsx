import Link from "next/link";
import { StatusBadge } from "@/components/StatusBadge";
import { collections } from "@/config/site";
import { requireMember } from "@/lib/member-auth";
import { listMySongs } from "@/lib/member-songs";
import { deleteContribution } from "./actions";
import { ContributeUploader } from "./ContributeUploader";
import { MemberBar } from "./MemberBar";

export default async function ContributePage() {
  // Bấm "Đóng góp" khi chưa đăng nhập → sang trang đăng nhập / đăng ký rồi quay lại đây
  const member = await requireMember("/dong-gop");
  const songs = await listMySongs(member);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Đóng góp</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Gửi tab <span className="highlight">của bạn</span>
          </h1>
        </div>
        <MemberBar member={member} />
      </div>

      <ContributeUploader />

      <section className="flex flex-col gap-3" aria-label="Bài đã gửi">
        <h2 className="text-xl font-semibold">Bài bạn đã gửi</h2>
        {songs.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-8 text-center text-muted">Chưa có bài nào.</p>
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-xl border border-border bg-surface">
            {songs.map((s) => (
              <li key={s.slug} className="flex flex-col gap-2 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    {s.status === "published" ? (
                      <Link href={`/bai/${s.slug}`} className="font-semibold underline-offset-4 hover:text-accent-ink hover:underline">
                        {s.title}
                      </Link>
                    ) : (
                      <p className="font-semibold">{s.title}</p>
                    )}
                    <p className="text-sm text-muted">
                      {collections[s.collection].title} · {s.level}
                      {s.artist ? ` · ${s.artist}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {s.status && <StatusBadge status={s.status} />}
                    {s.status !== "published" && (
                      <form action={deleteContribution.bind(null, s.slug)}>
                        <button type="submit" className="text-sm text-muted underline-offset-4 hover:text-red-300 hover:underline">
                          Xoá
                        </button>
                      </form>
                    )}
                  </div>
                </div>
                {s.status === "rejected" && s.reviewNote && (
                  <p className="rounded-lg border-l-4 border-red-400 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                    <b>Admin nhắn:</b> {s.reviewNote}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
