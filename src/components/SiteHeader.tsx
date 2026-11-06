import Link from "next/link";
import { collections } from "@/config/site";
import { Logo } from "./Logo";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-bg/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4">
        <Logo />
        <nav className="flex items-center gap-1 text-sm">
          {Object.values(collections).map((c) => (
            <Link
              key={c.slug}
              href={`/${c.slug}`}
              className="rounded-md px-2.5 py-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-text"
            >
              {c.title}
            </Link>
          ))}
          <Link
            href="/goi"
            className="ml-1 rounded-md bg-accent px-3 py-1.5 font-semibold text-accent-fg transition-opacity hover:opacity-90"
          >
            Đăng ký
          </Link>
        </nav>
      </div>
    </header>
  );
}
