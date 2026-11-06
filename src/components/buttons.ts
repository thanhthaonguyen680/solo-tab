/** Class nút dùng chung cho site và trang admin */
const base =
  "inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold transition-colors disabled:cursor-wait disabled:opacity-60";

const size = { md: "px-4 py-2.5 text-sm", lg: "px-5 py-3" } as const;

export function buttonPrimary(s: keyof typeof size = "md") {
  return `${base} ${size[s]} glow bg-accent text-accent-fg hover:bg-accent-hover`;
}

export function buttonSecondary(s: keyof typeof size = "md") {
  return `${base} ${size[s]} border border-border bg-bg text-soft hover:border-muted hover:text-text`;
}
