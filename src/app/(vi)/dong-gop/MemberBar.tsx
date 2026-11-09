import type { Member } from "@/lib/member-auth";
import { logoutMember } from "./actions";

/** Tên + nút đăng xuất của thành viên đang đăng nhập */
export function MemberBar({ member }: { member: Member }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-9 place-items-center rounded-full border border-accent/50 bg-fresh font-bold text-accent-ink">
        {member.name.slice(0, 1).toUpperCase()}
      </span>
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
