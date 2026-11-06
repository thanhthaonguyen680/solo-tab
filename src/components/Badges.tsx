export function AudioBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-xs text-muted">
      <svg viewBox="0 0 16 16" className="size-3" aria-hidden>
        <path fill="currentColor" d="M2 6h2.5L8 3v10L4.5 10H2zM10.5 5.2a4 4 0 0 1 0 5.6l-.9-.9a2.7 2.7 0 0 0 0-3.8z" />
      </svg>
      Audio
    </span>
  );
}

export function NewBadge() {
  return (
    <span className="rounded-full bg-fresh/15 px-2 py-0.5 text-xs font-semibold text-fresh">Mới</span>
  );
}

export function FreeBadge() {
  return (
    <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs font-semibold text-accent">Miễn phí</span>
  );
}

export function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[11px] text-muted">{children}</span>
  );
}
