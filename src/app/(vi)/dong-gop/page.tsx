import { ContributeTabs } from "./ContributeTabs";

/** Ai cũng đóng góp được, không cần tài khoản — bài gửi lên chờ admin duyệt rồi mới hiện trên site */
export default function ContributePage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="eyebrow">Đóng góp</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          Gửi tab <span className="highlight">của bạn</span>
        </h1>
        <p className="mt-2 text-muted">
          Không cần tài khoản. Tải file có sẵn lên hoặc tự soạn tab ngay tại đây — bài sẽ hiện trên site sau khi admin duyệt.
        </p>
      </div>

      <ContributeTabs />
    </div>
  );
}
