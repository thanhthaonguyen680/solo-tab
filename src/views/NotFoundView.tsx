import Link from "next/link";
import { buttonPrimary } from "@/components/buttons";
import { dict, paths, type Lang } from "@/i18n";

export function NotFoundView({ lang }: { lang: Lang }) {
  return (
    <section className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-24 text-center">
      <pre className="font-mono text-sm text-muted">{"e|---4---0---4---|\nB|---------------|"}</pre>
      <h1 className="text-3xl">{dict[lang].notFound.title}</h1>
      <Link href={paths.home(lang)} className={buttonPrimary("lg")}>
        {dict[lang].notFound.home}
      </Link>
    </section>
  );
}
