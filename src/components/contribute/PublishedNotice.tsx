import Link from "next/link";
import { buttonPrimary } from "@/components/buttons";
import { paths, type Lang } from "@/i18n";
import { contributeText } from "./contribute-i18n";

export type Published = { title: string; slug: string };

/** Báo bài đã lên site + nút mở thẳng trang bài */
export function PublishedNotice({ song, lang }: { song: Published; lang: Lang }) {
  const t = contributeText[lang];
  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent/40 bg-fresh px-4 py-3"
    >
      <p className="text-sm font-semibold text-accent-ink">{t.sent(song.title)}</p>
      <Link href={paths.song(lang, song.slug)} className={buttonPrimary()}>
        {t.view}
      </Link>
    </div>
  );
}
