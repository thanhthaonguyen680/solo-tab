"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { buttonSecondary } from "@/app/admin/ui";
import { NewTabForm } from "@/components/editor/NewTabForm";
import { TabPlayer } from "@/components/TabPlayer";
import { ContributionForm } from "./ContributionForm";

// Trình soạn nặng (alphaTab) → chỉ tải khi bấm "Mở trình soạn"
const TabEditor = dynamic(() => import("@/components/editor/TabEditor").then((m) => m.TabEditor), {
  ssr: false,
  loading: () => <p className="text-sm text-muted">Đang mở trình soạn…</p>,
});

type Step =
  | { kind: "setup" }
  | { kind: "edit"; notation: string; bpm: number; isNew: boolean }
  | { kind: "send"; notation: string; bpm: number };

/** Soạn tab từ đầu ngay trên trình duyệt: chọn khung tab → soạn với thanh công cụ → điền thông tin → gửi duyệt */
export function ComposeTab() {
  const [step, setStep] = useState<Step>({ kind: "setup" });
  const [notice, setNotice] = useState<string>();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-semibold">Tự soạn tab</h2>
        <p className="text-sm text-muted">
          Không có file Guitar Pro? Tạo khung tab trống rồi bấm vào từng chỗ để điền số phím, đổi trường độ, thêm luyến / ngân,
          nghe thử ngay — xong thì gửi.
        </p>
      </div>

      {notice && (
        <p role="status" className="rounded-xl border border-accent/40 bg-fresh px-4 py-3 text-sm font-semibold text-accent-ink">
          {notice}
        </p>
      )}

      {step.kind === "setup" && (
        <NewTabForm
          submitLabel="Mở trình soạn"
          onCreated={(notation, bpm) => {
            setNotice(undefined);
            setStep({ kind: "edit", notation, bpm, isNew: true });
          }}
        />
      )}

      {step.kind === "edit" && (
        <TabEditor
          notation={step.notation}
          isNew={step.isNew}
          saveLabel="Xong, gửi bài →"
          onSave={async (notation) => {
            setStep({ kind: "send", notation, bpm: step.bpm });
            return { ok: true };
          }}
          onClose={() => setStep({ kind: "setup" })}
        />
      )}

      {step.kind === "send" && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent/40 bg-fresh px-4 py-3">
            <p className="text-sm text-accent-ink">🎸 Tab đã soạn xong. Nghe lại lần cuối, điền thông tin bài rồi gửi.</p>
            <button
              type="button"
              onClick={() => setStep({ kind: "edit", notation: step.notation, bpm: step.bpm, isNew: false })}
              className={buttonSecondary}
            >
              ← Sửa tiếp
            </button>
          </div>
          <TabPlayer notation={step.notation} />
          <ContributionForm
            notation={step.notation}
            tempo={step.bpm}
            cancelLabel="Bỏ tab này"
            onCancel={() => {
              if (confirm("Bỏ tab vừa soạn?")) setStep({ kind: "setup" });
            }}
            onSent={(title) => {
              setStep({ kind: "setup" });
              setNotice(`✓ Đã gửi “${title}”. Bài sẽ hiện trên site sau khi admin duyệt.`);
            }}
          />
        </>
      )}
    </div>
  );
}
