"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { buttonPrimary, buttonSecondary } from "@/app/admin/ui";
import { NewTabForm } from "./NewTabForm";

// Trình sửa nặng (alphaTab) → chỉ tải khi bấm "Sửa tab" / "Tạo tab mới"
const TabEditor = dynamic(() => import("./TabEditor").then((m) => m.TabEditor), {
  ssr: false,
  loading: () => <p className="text-sm text-muted">Đang mở trình sửa…</p>,
});

type Mode = { kind: "idle" } | { kind: "form" } | { kind: "edit"; notation: string; isNew: boolean };

export function TabEditorLauncher({
  slug,
  title,
  artist,
  notation,
  defaultBpm,
}: {
  slug: string;
  title: string;
  artist?: string;
  notation: string | null;
  defaultBpm?: number;
}) {
  const [mode, setMode] = useState<Mode>({ kind: "idle" });

  if (mode.kind === "edit") {
    return (
      <TabEditor
        slug={slug}
        title={title}
        artist={artist}
        notation={mode.notation}
        isNew={mode.isNew}
        defaultBpm={mode.isNew ? undefined : defaultBpm}
        onClose={() => setMode({ kind: "idle" })}
      />
    );
  }

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">{notation ? "Sửa tab tương tác" : "Soạn tab tương tác"}</h2>
          <p className="text-sm text-muted">
            {notation
              ? "Bấm vào nốt để đổi phím, dây, trường độ, thêm/xoá nốt, tiếng đập “xx”, luyến — hoặc soạn lại từ đầu."
              : "Chưa có file Guitar Pro? Tạo tab trống rồi bấm vào từng chỗ để điền số phím, nghe thử và lưu."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setMode(mode.kind === "form" ? { kind: "idle" } : { kind: "form" })}
            className={notation ? buttonSecondary : buttonPrimary}
            aria-expanded={mode.kind === "form"}
          >
            Tạo tab mới
          </button>
          {notation && (
            <button type="button" onClick={() => setMode({ kind: "edit", notation, isNew: false })} className={buttonPrimary}>
              Sửa tab
            </button>
          )}
        </div>
      </div>

      {mode.kind === "form" && (
        <NewTabForm
          title={title}
          defaultBpm={defaultBpm}
          note={
            notation && (
              <>
                Bài này đã có tab. Tab mới chỉ thay tab cũ khi bạn bấm <b className="text-soft">Lưu tab</b>; bấm Đóng thì tab cũ giữ nguyên.
              </>
            )
          }
          onCreated={(created) => setMode({ kind: "edit", notation: created, isNew: true })}
          onCancel={() => setMode({ kind: "idle" })}
        />
      )}
    </section>
  );
}
