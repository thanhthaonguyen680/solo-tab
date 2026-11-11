import Link from "next/link";
import { collections, site } from "@/config/site";
import { dict, paths, type Lang } from "@/i18n";
import { buttonPrimary } from "./buttons";
import { LangSwitch } from "./LangSwitch";
import { Logo } from "./Logo";

export function SiteHeader({ lang = "vi", switcher = true }: { lang?: Lang; switcher?: boolean }) {
  const t = dict[lang];
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-bg/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-2 px-4">
        <Logo lang={lang} />
        <nav className="flex items-center gap-0.5 text-sm whitespace-nowrap sm:gap-2">
          {Object.values(collections).map((c) => (
            <Link
              key={c.slug}
              href={paths.collection(lang, c.slug)}
              className="rounded-lg px-1.5 py-2 font-semibold text-soft transition-colors hover:bg-surface hover:text-text sm:px-3"
            >
              {c.title}
            </Link>
          ))}
          <Link
            href={paths.contribute(lang)}
            className="mr-1 rounded-lg border border-accent/40 px-2 py-2 font-semibold sm:mr-0 text-accent-ink transition-colors hover:bg-fresh sm:px-3"
          >
            {t.nav.contribute}
          </Link>
          {site.membership && (
            <Link href="/goi" className={`ml-1 ${buttonPrimary()}`}>
              {t.nav.signUp}
            </Link>
          )}
          {switcher && <LangSwitch lang={lang} />}
        </nav>
      </div>
    </header>
  );
}
