import type { Member } from "@/lib/member-auth";
import { logoutMember } from "./actions";

/** Ảnh đại diện + tên + nút đăng xuất của thành viên đang đăng nhập */
export function MemberBar({ member }: { member: Member }) {
  return (
    <div className="flex items-center gap-3">
      {member.avatarUrl ? (
        // Ảnh Google (lh3.googleusercontent.com) — không qua next/image để khỏi khai báo domain
        // eslint-disable-next-line @next/next/no-img-element
        <img src={member.avatarUrl} alt="" width={36} height={36} referrerPolicy="no-referrer" className="size-9 rounded-full border border-border" />
      ) : (
        <span className="grid size-9 place-items-center rounded-full border border-border bg-surface font-bold">
          {member.name.slice(0, 1).toUpperCase()}
        </span>
      )}
      <div className="min-w-0 text-sm leading-tight">
        <p className="truncate font-semibold">{member.name}</p>
        <form action={logoutMember}>
          <button type="submit" className="text-muted underline-offset-4 hover:text-text hover:underline">
            Đăng xuất
          </button>
        </form>
      </div>
    </div>
  );
}
