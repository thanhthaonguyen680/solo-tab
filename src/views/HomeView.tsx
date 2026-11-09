import Link from "next/link";
import { buttonPrimary, buttonSecondary } from "@/components/buttons";
import { SongCard } from "@/components/SongCard";
import { collections, site } from "@/config/site";
import { dict, paths, type Lang } from "@/i18n";
import { getSongs } from "@/lib/songs";

export async function HomeView({ lang }: { lang: Lang }) {
  const t = dict[lang];
  const all = await getSongs();
  const latest = all.slice(0, 6);
  const countIn = (slug: string) => all.filter((s) => s.collection === slug).length;
  const solo = paths.collection(lang, "solo");

  return (
    <>
      <section className="strings border-b border-line">
        <div className="mx-auto flex max-w-5xl flex-col items-start gap-6 px-4 py-20 sm:py-28">
          <Link
            href={solo}
            className="group inline-flex items-center gap-2 rounded-full border border-accent/40 bg-fresh/60 py-1 pr-3 pl-1 text-sm text-accent-ink transition-colors hover:border-accent"
          >
            <span className="rounded-full border border-accent/40 px-2 py-0.5 font-semibold">{t.songs(all.length)}</span>
            {t.home.updated}
            <span className="transition-transform group-hover:translate-x-0.5">→</span>
          </Link>
          <h1 className="max-w-3xl text-5xl leading-[1.08] sm:text-6xl">{t.home.title}</h1>
          <p className="max-w-xl text-lg leading-relaxed text-muted sm:text-xl">{t.home.lead}</p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link href={solo} className={buttonPrimary("lg")}>
              {t.home.browse}
            </Link>
            {site.membership ? (
              <Link href="/goi" className={buttonSecondary("lg")}>
                {t.home.perMonth(site.pricePerMonth)}
              </Link>
            ) : (
              <Link href={paths.collection(lang, "melody")} className={buttonSecondary("lg")}>
                {t.home.melody}
              </Link>
            )}
          </div>
        </div>
      </section>

      <section className="border-b border-line bg-surface">
        <div className="mx-auto max-w-5xl px-4 py-16">
          <p className="eyebrow">{t.home.libraryEyebrow}</p>
          <h2 className="mt-3 max-w-2xl text-3xl sm:text-4xl">{t.home.libraryTitle}</h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            {Object.values(collections).map((c, i) => (
              <Link
                key={c.slug}
                href={paths.collection(lang, c.slug)}
                className="group flex flex-col gap-3 rounded-2xl border border-border bg-bg p-6 transition-colors hover:border-accent/60"
              >
                <div className="flex items-center justify-between">
                  <span className="grid size-11 place-items-center rounded-full bg-accent font-display font-bold text-accent-fg">
                    0{i + 1}
                  </span>
                  <span className="font-mono text-sm text-muted">{t.songs(countIn(c.slug))}</span>
                </div>
                <h3 className="mt-2 font-display text-2xl font-semibold tracking-tight">{c.title}</h3>
                <p className="text-muted">{t.collections[c.slug]}</p>
                <span className="mt-1 text-sm font-semibold text-accent-ink">
                  {t.home.open(c.title)}{" "}
                  <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-16">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow">{t.home.latestEyebrow}</p>
            <h2 className="mt-3 text-3xl sm:text-4xl">{t.home.latestTitle}</h2>
          </div>
          <Link href={solo} className="text-sm font-semibold text-accent-ink hover:underline">
            {t.home.seeAll}
          </Link>
        </div>
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {latest.map((s) => (
            <SongCard key={s.slug} song={s} lang={lang} />
          ))}
        </div>
      </section>
    </>
  );
}
