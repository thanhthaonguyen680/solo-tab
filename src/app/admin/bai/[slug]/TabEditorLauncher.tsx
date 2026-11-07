"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { buttonPrimary } from "../../ui";

// Trình sửa nặng (alphaTab) → chỉ tải khi bấm "Sửa tab"
const TabEditor = dynamic(() => import("./TabEditor").then((m) => m.TabEditor), {
  ssr: false,
  loading: () => <p className="text-sm text-muted">Đang mở trình sửa…</p>,
});

export function TabEditorLauncher({ slug, notation }: { slug: string; notation: string }) {
  const [open, setOpen] = useState(false);
  if (open) return <TabEditor slug={slug} notation={notation} onClose={() => setOpen(false)} />;
  return (
    <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-5">
      <div>
        <h2 className="text-xl font-semibold">Sửa tab tương tác</h2>
        <p className="text-sm text-muted">Bấm vào nốt để đổi phím, dây, trường độ, thêm/xoá nốt, tiếng đập “xx”, luyến — nghe thử rồi lưu.</p>
      </div>
      <button type="button" onClick={() => setOpen(true)} className={buttonPrimary}>
        Sửa tab
      </button>
    </section>
  );
}
