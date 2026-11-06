import Link from "next/link";
import type { SongSummary } from "@/lib/songs";
import { AudioBadge, FreeBadge, NewBadge, Tag } from "./Badges";

const levelBars = { "Dễ": 1, "Vừa": 2, "Khó": 3 } as const;

export function SongCard({ song }: { song: SongSummary }) {
  return (
    <Link
      href={`/bai/${song.slug}`}
      className="group relative flex flex-col gap-3 overflow-hidden rounded-xl border border-border bg-surface p-4 transition-colors hover:border-accent/60 hover:bg-surface-2"
    >
      {/* vạch màu bên trái, hiện khi hover */}
      <span className="absolute inset-y-0 left-0 w-0.5 bg-accent opacity-0 transition-opacity group-hover:opacity-100" />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-semibold leading-snug">{song.title}</h3>
          {song.artist && <p className="truncate text-sm text-muted">{song.artist}</p>}
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-1">
          {song.free && <FreeBadge />}
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
                className={`w-1 rounded-sm ${n <= levelBars[song.level] ? "bg-accent" : "bg-border"}`}
                style={{ height: 4 + n * 3 }}
              />
            ))}
          </span>
        </div>
      </div>
    </Link>
  );
}
