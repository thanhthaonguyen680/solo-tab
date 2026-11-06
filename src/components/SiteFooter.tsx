import { site } from "@/config/site";

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-8 text-sm text-muted">
        <span>
          <span className="font-display font-semibold text-text">{site.name}</span> · {site.tagline}
        </span>
        <a href={site.contact.href} className="font-semibold text-soft transition-colors hover:text-accent-ink">
          {site.contact.label} →
        </a>
      </div>
    </footer>
  );
}
