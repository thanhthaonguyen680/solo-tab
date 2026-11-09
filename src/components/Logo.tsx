import Link from "next/link";
import { dict, paths, type Lang } from "@/i18n";

export function Logo({ lang = "vi" }: { lang?: Lang }) {
  return (
    <Link href={paths.home(lang)} className="group flex shrink-0 items-center gap-1.5 sm:gap-2" aria-label={`solo.tab — ${dict[lang].nav.home}`}>
      <svg viewBox="0 0 24 24" className="size-7 transition-transform group-hover:-rotate-12" aria-hidden>
        {/* Miếng gảy đàn */}
        <path
          fill="var(--accent)"
          d="M12 2.5c-4.6 0-8.5 1.7-8.5 5.2 0 4.6 5.3 11.6 7.3 13.4a1.8 1.8 0 0 0 2.4 0c2-1.8 7.3-8.8 7.3-13.4 0-3.5-3.9-5.2-8.5-5.2Z"
        />
        <path stroke="var(--accent-fg)" strokeWidth="1.4" strokeLinecap="round" d="M8.5 8h7M8.5 10.5h7M8.5 13h7" />
      </svg>
      <span className="font-display text-lg font-semibold tracking-tight sm:text-xl">
        solo<span className="text-accent-ink">.tab</span>
      </span>
    </Link>
  );
}
