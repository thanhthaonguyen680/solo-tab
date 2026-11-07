import Link from "next/link";
import { collections, site } from "@/config/site";
import { buttonPrimary } from "./buttons";
import { Logo } from "./Logo";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-bg/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-3 px-4">
        <Logo />
        <nav className="flex items-center gap-1 text-sm sm:gap-2">
          {Object.values(collections).map((c) => (
            <Link
              key={c.slug}
              href={`/${c.slug}`}
              className="rounded-lg px-3 py-2 font-semibold text-soft transition-colors hover:bg-surface hover:text-text"
            >
              {c.title}
            </Link>
          ))}
          <Link
            href="/dong-gop"
            className="rounded-lg border border-accent/40 px-3 py-2 font-semibold text-accent-ink transition-colors hover:bg-fresh"
          >
            Đóng góp
          </Link>
          {site.membership && (
            <Link href="/goi" className={`ml-1 ${buttonPrimary()}`}>
              Đăng ký
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
