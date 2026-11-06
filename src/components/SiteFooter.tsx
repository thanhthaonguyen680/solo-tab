import { site } from "@/config/site";

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-6 text-sm text-muted">
        <span className="font-mono">
          {site.name} · {site.tagline}
        </span>
        <a href={site.contact.href} className="hover:text-text">
          {site.contact.label}
        </a>
      </div>
    </footer>
  );
}
