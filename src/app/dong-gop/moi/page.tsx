import type { Metadata } from "next";
import Link from "next/link";
import { requireMember } from "@/lib/member-auth";
import { createSubmission } from "../actions";
import { MemberSongForm } from "../MemberSongForm";

export const metadata: Metadata = { title: "Gửi tab mới" };

export default async function NewSubmissionPage() {
  await requireMember("/dong-gop/moi");
  return (
    <div className="flex flex-col gap-6">
      <Link href="/dong-gop" className="w-fit text-sm text-muted hover:text-text">
        ← Tab của tôi
      </Link>
      <div>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Gửi <span className="highlight">tab mới</span>
        </h1>
        <p className="mt-1 text-muted">Bước 1/2: thông tin bài. Bước sau bạn thêm tab rồi gửi duyệt.</p>
      </div>
      <MemberSongForm action={createSubmission} />
    </div>
  );
}
