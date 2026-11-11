"use client";

import { useState } from "react";
import { ComposeTab } from "./ComposeTab";
import { ContributeUploader } from "./ContributeUploader";

const TABS = [
  { id: "file", label: "Tải file lên", hint: "Guitar Pro, PDF, MusicXML" },
  { id: "compose", label: "Tự soạn tab", hint: "Trình soạn có sẵn" },
] as const;

type TabId = (typeof TABS)[number]["id"];

/**
 * Hai cách đóng góp. Cả hai khung luôn được giữ (chỉ ẩn đi) → chuyển qua lại không mất bài đang soạn / file đã đọc.
 */
export function ContributeTabs() {
  const [active, setActive] = useState<TabId>("file");

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const i = TABS.findIndex((t) => t.id === active);
    const next = TABS[(i + (e.key === "ArrowRight" ? 1 : TABS.length - 1)) % TABS.length];
    setActive(next.id);
    document.getElementById(`contribute-tab-${next.id}`)?.focus();
  }

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-accent/40 bg-surface p-5" aria-label="Gửi bài">
      <div role="tablist" aria-label="Cách đóng góp" className="grid grid-cols-2 gap-2 rounded-xl border border-line bg-bg p-1" onKeyDown={onKeyDown}>
        {TABS.map((t) => {
          const on = t.id === active;
          return (
            <button
              key={t.id}
              id={`contribute-tab-${t.id}`}
              type="button"
              role="tab"
              aria-selected={on}
              aria-controls={`contribute-panel-${t.id}`}
              tabIndex={on ? 0 : -1}
              onClick={() => setActive(t.id)}
              className={`flex flex-col items-center rounded-lg px-3 py-2.5 text-center transition-colors ${
                on ? "bg-accent text-accent-fg" : "text-soft hover:bg-surface-2 hover:text-text"
              }`}
            >
              <span className="font-semibold">{t.label}</span>
              <span className={`text-xs ${on ? "opacity-80" : "text-muted"}`}>{t.hint}</span>
            </button>
          );
        })}
      </div>

      {TABS.map((t) => (
        <div
          key={t.id}
          id={`contribute-panel-${t.id}`}
          role="tabpanel"
          aria-labelledby={`contribute-tab-${t.id}`}
          hidden={t.id !== active}
        >
          {t.id === "file" ? <ContributeUploader /> : <ComposeTab />}
        </div>
      ))}
    </section>
  );
}
