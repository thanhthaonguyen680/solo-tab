import Link from "next/link";
import { buttonPrimary, buttonSecondary } from "@/components/buttons";
import { SongList } from "@/components/SongList";
import { site } from "@/config/site";
import { dict, type Lang } from "@/i18n";
import { getSongs } from "@/lib/songs";

export async function HomeView({ lang }: { lang: Lang }) {
  const t = dict[lang];
  const all = await getSongs();
  // Nút / nhãn ở đầu trang → cuộn xuống danh sách bài bên dưới
  const list = "#danh-sach";

  return (
    <>
      <section className="strings border-b border-line">
        <div className="mx-auto flex max-w-5xl flex-col items-start gap-6 px-4 py-20 sm:py-28">
          <Link
            href={list}
            className="group inline-flex items-center gap-2 rounded-full border border-accent/40 bg-fresh/60 py-1 pr-3 pl-1 text-sm text-accent-ink transition-colors hover:border-accent"
          >
            <span className="rounded-full border border-accent/40 px-2 py-0.5 font-semibold">{t.songs(all.length)}</span>
            {t.home.updated}
            <span className="transition-transform group-hover:translate-x-0.5">→</span>
          </Link>
          <h1 className="max-w-3xl text-5xl leading-[1.08] sm:text-6xl">{t.home.title}</h1>
          <p className="max-w-xl text-lg leading-relaxed text-muted sm:text-xl">{t.home.lead}</p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link href={list} className={buttonPrimary("lg")}>
              {t.home.browse}
            </Link>
            {site.membership && (
              <Link href="/goi" className={buttonSecondary("lg")}>
                {t.home.perMonth(site.pricePerMonth)}
              </Link>
            )}
          </div>
        </div>
      </section>

      <section id="danh-sach" className="mx-auto max-w-5xl scroll-mt-16 px-4 py-16">
        <p className="eyebrow">{t.home.latestEyebrow}</p>
        <h2 className="mt-3 text-3xl sm:text-4xl">{t.home.latestTitle}</h2>
        {/* Bài mới nhất lên đầu */}
        <SongList songs={all} lang={lang} />
      </section>
    </>
  );
}
