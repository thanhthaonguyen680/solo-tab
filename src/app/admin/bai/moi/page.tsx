import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin-auth";
import { saveSong } from "../../actions";
import { SongForm } from "../../SongForm";

export const metadata: Metadata = { title: "Thêm bài" };

export default async function NewSongPage() {
  await requireAdmin();

  return (
    <div className="flex flex-col gap-6">
      <Link href="/admin" className="w-fit text-sm text-muted hover:text-text">
        ← Danh sách bài
      </Link>
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
        Thêm <span className="highlight">bài mới</span>
      </h1>
      <SongForm today={new Date().toISOString().slice(0, 10)} action={saveSong.bind(null, null)} />
    </div>
  );
}
