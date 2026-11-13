"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { buttonSecondary } from "@/app/admin/ui";
import { NewTabForm } from "@/components/editor/NewTabForm";
import { TabPlayer } from "@/components/TabPlayer";
import { langOf, type Lang } from "@/i18n";
import { contributeText } from "./contribute-i18n";
import { type Published, PublishedNotice } from "./PublishedNotice";
import { ContributionForm } from "./ContributionForm";

// Trình soạn nặng (alphaTab) → chỉ tải khi bấm "Mở trình soạn"
const TabEditor = dynamic(() => import("@/components/editor/TabEditor").then((m) => m.TabEditor), {
  ssr: false,
  // chỗ chờ không nhận được props → đoán ngôn ngữ theo đường dẫn
  loading: () => <p className="text-sm text-muted">{contributeText[langOf(location.pathname)].compose.opening}</p>,
});

type Song = { title: string; artist: string };
type Step =
  | { kind: "setup" }
  | { kind: "edit"; notation: string; bpm: number; song: Song; isNew: boolean }
  | { kind: "send"; notation: string; bpm: number; song: Song };

/** Soạn tab từ đầu ngay trên trình duyệt: chọn khung tab → soạn với thanh công cụ → điền thông tin → đăng lên site */
export function ComposeTab({ lang }: { lang: Lang }) {
  const t = contributeText[lang];
  const [step, setStep] = useState<Step>({ kind: "setup" });
  const [published, setPublished] = useState<Published>();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-semibold">{t.compose.heading}</h2>
        <p className="text-sm text-muted">{t.compose.intro}</p>
      </div>

      {published && <PublishedNotice song={published} lang={lang} />}

      {step.kind === "setup" && (
        <NewTabForm
          submitLabel={t.compose.open}
          lang={lang}
          contribute
          onCreated={(notation, bpm, song) => {
            setPublished(undefined);
            setStep({ kind: "edit", notation, bpm, song, isNew: true });
          }}
        />
      )}

      {step.kind === "edit" && (
        <TabEditor
          notation={step.notation}
          title={step.song.title}
          artist={step.song.artist}
          isNew={step.isNew}
          grow
          saveLabel={t.compose.done}
          lang={lang}
          onSave={async (notation) => {
            setStep({ kind: "send", notation, bpm: step.bpm, song: step.song });
            return { ok: true };
          }}
          onClose={() => setStep({ kind: "setup" })}
        />
      )}

      {step.kind === "send" && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent/40 bg-fresh px-4 py-3">
            <p className="text-sm text-accent-ink">{t.compose.finished}</p>
            <button
              type="button"
              onClick={() => setStep({ kind: "edit", notation: step.notation, bpm: step.bpm, song: step.song, isNew: false })}
              className={buttonSecondary}
            >
              {t.compose.editMore}
            </button>
          </div>
          <TabPlayer notation={step.notation} lang={lang} />
          <ContributionForm
            notation={step.notation}
            tempo={step.bpm}
            defaultTitle={step.song.title}
            defaultArtist={step.song.artist}
            cancelLabel={t.compose.discard}
            lang={lang}
            onCancel={() => {
              if (confirm(t.compose.confirmDiscard)) setStep({ kind: "setup" });
            }}
            onSent={(title, slug) => {
              setStep({ kind: "setup" });
              setPublished({ title, slug });
            }}
          />
        </>
      )}
    </div>
  );
}
