import Link from "next/link";
import { site } from "@/config/site";
import type { SongSummary } from "@/lib/songs";
import { AudioBadge, FreeBadge, NewBadge, Tag } from "./Badges";

const levelBars = { "Dễ": 1, "Vừa": 2, "Khó": 3 } as const;

export function SongCard({ song }: { song: SongSummary }) {
  return (
    <Link
      href={`/bai/${song.slug}`}
      className="group flex flex-col gap-3 rounded-xl border border-line bg-surface p-4 transition-colors hover:border-accent/50 hover:bg-surface-2"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-semibold leading-snug transition-colors group-hover:text-accent-ink">{song.title}</h3>
          {song.artist && <p className="truncate text-sm text-muted">{song.artist}</p>}
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-1">
          {site.membership && song.free && <FreeBadge />}
          {song.isNew && <NewBadge />}
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
          <span className="flex items-end gap-0.5" title={`Độ khó: ${song.level}`} aria-label={`Độ khó: ${song.level}`}>
            {[1, 2, 3].map((n) => (
              <span
                key={n}
                className={`w-1.5 rounded-[2px] ${n <= levelBars[song.level] ? "bg-accent" : "bg-border"}`}
                style={{ height: 4 + n * 3 }}
              />
            ))}
          </span>
        </div>
      </div>
    </Link>
  );
}
