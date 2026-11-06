import Link from "next/link";
import { collections } from "@/config/site";
import { listSongsForAdmin } from "@/lib/admin-songs";
import { logout } from "./actions";
import { buttonPrimary, buttonSecondary } from "./ui";

export default async function AdminHome(props: PageProps<"/admin">) {
  const songs = await listSongsForAdmin(); // tự kiểm tra quyền admin
  const sp = await props.searchParams;
  const saved = typeof sp["da-luu"] === "string" ? sp["da-luu"] : undefined;
  const deleted = sp["da-xoa"] === "1";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Quản lý <span className="highlight">bài</span>
          </h1>
          <p className="mt-1 text-muted">{songs.length} bài trong kho</p>
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

      {(saved || deleted) && (
        <p role="status" className="rounded-xl border border-accent/40 bg-fresh px-4 py-3 text-sm font-semibold text-accent-ink">
          {saved ? (
            <>
              ✓ Đã lưu.{" "}
              <Link href={`/bai/${saved}`} className="underline underline-offset-4">
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
                  </td>
                  <td className="px-4 py-3">{collections[s.collection].title}</td>
                  <td className="px-4 py-3">{s.level}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1 text-xs">
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
                      {!s.tab && s.sheetPageCount === 0 && (
                        <span className="rounded-full border border-dashed border-border px-2 py-0.5 font-semibold text-muted">
                          Chưa có tab
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
