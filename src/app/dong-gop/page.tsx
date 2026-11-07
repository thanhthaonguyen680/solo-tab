import Link from "next/link";
import { buttonPrimary } from "@/components/buttons";
import { StatusBadge } from "@/components/StatusBadge";
import { collections, site } from "@/config/site";
import { getMember } from "@/lib/member-auth";
import { listMySongs } from "@/lib/member-songs";
import { MemberBar } from "./MemberBar";

export default async function ContributePage(props: PageProps<"/dong-gop">) {
  const member = await getMember();
  if (!member) return <Landing />;

  const songs = await listMySongs(member);
  const deleted = (await props.searchParams)["da-xoa"] === "1";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Đóng góp</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Tab <span className="highlight">của tôi</span>
          </h1>
        </div>
        <MemberBar member={member} />
      </div>

      {deleted && (
        <p role="status" className="rounded-xl border border-accent/40 bg-fresh px-4 py-3 text-sm font-semibold text-accent-ink">
          ✓ Đã xoá bài.
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-5">
        <p className="text-sm text-muted">
          Tạo bài → thêm tab (file Guitar Pro, sheet PDF hoặc tự soạn trên web) → <b className="text-soft">Gửi duyệt</b>. Bài được
          duyệt sẽ hiện trên {site.name} kèm tên bạn.
        </p>
        <Link href="/dong-gop/moi" className={buttonPrimary()}>
          + Gửi tab mới
        </Link>
      </div>

      {songs.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-10 text-center text-muted">Bạn chưa gửi bài nào.</p>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-xl border border-border bg-surface">
          {songs.map((s) => (
            <li key={s.slug}>
              <Link
                href={s.status === "published" ? `/bai/${s.slug}` : `/dong-gop/${s.slug}`}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-surface-2"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold">{s.title}</p>
                  <p className="text-sm text-muted">
                    {collections[s.collection].title} · {s.level}
                    {s.notation ? " · có tab tương tác" : ""}
                    {s.sheetPageCount ? ` · PDF ${s.sheetPageCount} trang` : ""}
                  </p>
                </div>
                {s.status && <StatusBadge status={s.status} />}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Landing() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-start gap-6 py-6">
      <p className="eyebrow">Đóng góp</p>
      <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
        Đăng tab <span className="highlight">bạn tự soạn</span>
      </h1>
      <p className="text-lg text-muted">
        Có bản solo hay bạn tự soạn? Đăng lên {site.name} để mọi người cùng tập — tab tương tác phát nhạc theo từng nốt, kèm tên
        bạn trên trang bài.
      </p>
      <ul className="flex flex-col gap-2 text-soft">
        <li>🎸 Tải lên file <b>Guitar Pro</b> (.gp, .gp5…) hoặc <b>sheet PDF</b> — tự chuyển thành tab tương tác</li>
        <li>✍️ Hoặc <b>soạn tab ngay trên web</b>: bấm vào dây, gõ số phím, nghe thử</li>
        <li>✅ Bài được kiểm duyệt trước khi đăng để giữ chất lượng kho tab</li>
      </ul>
      <Link href="/dang-nhap?next=/dong-gop" className={buttonPrimary("lg")}>
        Đăng nhập để bắt đầu
      </Link>
    </div>
  );
}
