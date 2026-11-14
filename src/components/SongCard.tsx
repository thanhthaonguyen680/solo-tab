import Link from "next/link";
import { site } from "@/config/site";
import { dict, paths, type Lang } from "@/i18n";
import type { SongSummary } from "@/lib/songs";
import { AudioBadge, FreeBadge, NewBadge, Tag } from "./Badges";

/** Màu nhãn độ khó: dễ xanh lá, vừa vàng, khó đỏ */
const levelStyle = {
  "Dễ": "border-emerald-400/40 bg-emerald-400/10 text-emerald-300",
  "Vừa": "border-amber-400/40 bg-amber-400/10 text-amber-300",
  "Khó": "border-rose-400/40 bg-rose-400/10 text-rose-300",
} as const;

export function SongCard({ song, lang = "vi" }: { song: SongSummary; lang?: Lang }) {
  const level = `${dict[lang].song.level}: ${dict[lang].level[song.level]}`;
  return (
    <Link
      href={paths.song(lang, song.slug)}
      className="group flex flex-col gap-3 rounded-xl border border-line bg-surface p-4 transition-colors hover:border-accent/50 hover:bg-surface-2"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-semibold leading-snug transition-colors group-hover:text-accent-ink">{song.title}</h3>
          {song.artist && <p className="truncate text-sm text-muted">{song.artist}</p>}
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-1">
          {site.membership && song.free && <FreeBadge lang={lang} />}
          {song.isNew && <NewBadge lang={lang} />}
          {song.hasAudio && <AudioBadge />}
        </div>
      </div>

      <div className="mt-auto flex items-end justify-between gap-3">
        <div className="flex flex-wrap gap-1">
          {song.tags.map((t) => (
            <Tag key={t}>{t}</Tag>
          ))}
        </div>
        <div className="flex shrink-0 items-center gap-2 font-mono text-[11px] text-muted">
          {song.key && <span>{song.key}</span>}
          <span
            title={level}
            className={`rounded-full border px-2 py-0.5 font-sans text-xs font-semibold ${levelStyle[song.level]}`}
          >
            {dict[lang].level[song.level]}
          </span>
        </div>
      </div>
    </Link>
  );
}
