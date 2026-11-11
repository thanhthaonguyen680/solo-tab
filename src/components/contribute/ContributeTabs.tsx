"use client";

import { useState } from "react";
import type { Lang } from "@/i18n";
import { ComposeTab } from "./ComposeTab";
import { contributeText } from "./contribute-i18n";
import { ContributeUploader } from "./ContributeUploader";

const TABS = ["file", "compose"] as const;
type TabId = (typeof TABS)[number];

/**
 * Hai cách đóng góp. Cả hai khung luôn được giữ (chỉ ẩn đi) → chuyển qua lại không mất bài đang soạn / file đã đọc.
 */
export function ContributeTabs({ lang }: { lang: Lang }) {
  const t = contributeText[lang].tabs;
  const [active, setActive] = useState<TabId>("file");

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const next = TABS[(TABS.indexOf(active) + (e.key === "ArrowRight" ? 1 : TABS.length - 1)) % TABS.length];
    setActive(next);
    document.getElementById(`contribute-tab-${next}`)?.focus();
  }

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-accent/40 bg-surface p-5" aria-label={t.region}>
      <div role="tablist" aria-label={t.list} className="grid grid-cols-2 gap-2 rounded-xl border border-line bg-bg p-1" onKeyDown={onKeyDown}>
        {TABS.map((id) => {
          const on = id === active;
          return (
            <button
              key={id}
              id={`contribute-tab-${id}`}
              type="button"
              role="tab"
              aria-selected={on}
              aria-controls={`contribute-panel-${id}`}
              tabIndex={on ? 0 : -1}
              onClick={() => setActive(id)}
              className={`flex flex-col items-center rounded-lg px-3 py-2.5 text-center transition-colors ${
                on ? "bg-accent text-accent-fg" : "text-soft hover:bg-surface-2 hover:text-text"
              }`}
            >
              <span className="font-semibold">{t[id].label}</span>
              <span className={`text-xs ${on ? "opacity-80" : "text-muted"}`}>{t[id].hint}</span>
            </button>
          );
        })}
      </div>

      {TABS.map((id) => (
        <div
          key={id}
          id={`contribute-panel-${id}`}
          role="tabpanel"
          aria-labelledby={`contribute-tab-${id}`}
          hidden={id !== active}
        >
          {id === "file" ? <ContributeUploader lang={lang} /> : <ComposeTab lang={lang} />}
        </div>
      ))}
    </section>
  );
}
