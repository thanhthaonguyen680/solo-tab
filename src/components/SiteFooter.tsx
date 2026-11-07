import { site } from "@/config/site";

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-surface text-sm text-muted">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-8">
        <span>
          <span className="font-display font-semibold text-text">{site.name}</span> · {site.tagline}
        </span>
        <a href={site.contact.href} className="font-semibold text-soft transition-colors hover:text-accent-ink">
          {site.contact.label} →
        </a>
      </div>
      <div className="border-t border-line">
        <p className="mx-auto max-w-5xl px-4 py-4 text-xs">
          © {site.since} {site.name} · A product by{" "}
          <span className="font-semibold text-soft">{site.owner}</span>
        </p>
      </div>
    </footer>
  );
}
