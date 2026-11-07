import { STATUS_LABEL, type SongStatus } from "@/lib/song-model";

const STYLE: Record<SongStatus, string> = {
  draft: "border-dashed border-border text-muted",
  pending: "border-amber-400/60 bg-amber-400/10 text-amber-200",
  published: "border-accent bg-accent text-accent-fg",
  rejected: "border-red-500/60 bg-red-500/10 text-red-300",
};

export function StatusBadge({ status }: { status: SongStatus }) {
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${STYLE[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}
