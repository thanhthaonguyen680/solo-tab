import Link from "next/link";
import { collections } from "@/config/site";
import { StatusBadge } from "@/components/StatusBadge";
import { listSongsForAdmin } from "@/lib/admin-songs";
import { logout } from "./actions";
import { buttonPrimary, buttonSecondary } from "./ui";

export default async function AdminHome(props: PageProps<"/admin">) {
  const songs = await listSongsForAdmin(); // tự kiểm tra quyền admin
  const sp = await props.searchParams;
  const saved = typeof sp["da-luu"] === "string" ? sp["da-luu"] : undefined;
  const deleted = sp["da-xoa"] === "1";
  const approved = typeof sp["da-duyet"] === "string" ? sp["da-duyet"] : undefined;
  const pending = songs.filter((s) => s.status === "pending");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Quản lý <span className="highlight">bài</span>
          </h1>
          <p className="mt-1 text-muted">
            {songs.filter((s) => s.status === "published").length} bài đã đăng
            {pending.length > 0 && ` · ${pending.length} bài chờ duyệt`}
          </p>
        </div>
        <div className="flex gap-2">
          <form action={logout}>
            <button type="submit" className={buttonSecondary}>
              Đăng xuất
            </button>
          </form>
          <Link href="/admin/bai/moi" className={buttonPrimary}>
            + Thêm bài
          </Link>
        </div>
      </div>

      {approved && (
        <p role="status" className="rounded-xl border border-accent/40 bg-fresh px-4 py-3 text-sm font-semibold text-accent-ink">
          ✓ Đã duyệt và đăng.{" "}
          <Link href={`/${approved}`} className="underline underline-offset-4">
            Xem trên site →
          </Link>
        </p>
      )}

      {pending.length > 0 && (
        <section className="flex flex-col gap-2 rounded-2xl border border-amber-400/40 bg-amber-400/5 p-4" aria-label="Chờ duyệt">
          <h2 className="font-semibold">Chờ duyệt ({pending.length})</h2>
          <ul className="flex flex-col divide-y divide-line">
            {pending.map((s) => (
              <li key={s.slug} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span>
                  <b>{s.title}</b> <span className="text-sm text-muted">— gửi bởi {s.authorName ?? "khách (không ghi tên)"}</span>
                </span>
                <Link href={`/admin/bai/${s.slug}`} className="text-sm font-bold underline underline-offset-4 hover:text-accent-ink">
                  Xem & duyệt →
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {(saved || deleted) && (
        <p role="status" className="rounded-xl border border-accent/40 bg-fresh px-4 py-3 text-sm font-semibold text-accent-ink">
          {saved ? (
            <>
              ✓ Đã lưu.{" "}
              <Link href={`/${saved}`} className="underline underline-offset-4">
                Xem trên site →
              </Link>
            </>
          ) : (
            "✓ Đã xoá bài."
          )}
        </p>
      )}

      {songs.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-10 text-center text-muted">
          Chưa có bài nào. Bấm “Thêm bài” để bắt đầu.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b-2 border-border bg-surface-2 text-xs font-bold tracking-wide uppercase">
              <tr>
                <th className="px-4 py-3">Bài</th>
                <th className="px-4 py-3">Kho</th>
                <th className="px-4 py-3">Độ khó</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3">Ngày thêm</th>
                <th className="px-4 py-3">
                  <span className="sr-only">Thao tác</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {songs.map((s) => (
                <tr key={s.slug} className={s.slug === saved ? "bg-accent/10" : undefined}>
                  <td className="px-4 py-3">
                    <p className="font-bold">{s.title}</p>
                    <p className="text-muted">{s.artist ?? "—"}</p>
                    {s.contributed && <p className="text-xs text-muted">Người gửi: {s.authorName ?? "khách"}</p>}
                  </td>
                  <td className="px-4 py-3">{collections[s.collection].title}</td>
                  <td className="px-4 py-3">{s.level}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1 text-xs">
                      {s.status && s.status !== "published" && <StatusBadge status={s.status} />}
                      {s.free && (
                        <span className="rounded-full border border-accent bg-accent px-2 py-0.5 font-semibold text-accent-fg">
                          Miễn phí
                        </span>
                      )}
                      {s.sheetPageCount > 0 && (
                        <span className="rounded-full border border-accent/40 bg-fresh px-2 py-0.5 font-semibold text-accent-ink">
                          PDF · {s.sheetPageCount} trang
                        </span>
                      )}
                      {s.notation && (
                        <span className="rounded-full border border-accent bg-accent px-2 py-0.5 font-semibold text-accent-fg">
                          Tab tương tác
                        </span>
                      )}
                      {s.sheetPageCount === 0 && (
                        <span className="rounded-full border border-dashed border-border px-2 py-0.5 font-semibold text-muted">
                          Chưa có PDF
                        </span>
                      )}
                      {s.audioUrl && (
                        <span className="rounded-full border border-border px-2 py-0.5 font-semibold">Audio</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{s.addedAt}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/bai/${s.slug}`}
                      className="font-bold underline underline-offset-4 hover:text-accent-ink"
                    >
                      Sửa
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
