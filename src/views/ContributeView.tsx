import type { Metadata } from "next";
import { contributeText } from "@/components/contribute/contribute-i18n";
import { ContributeTabs } from "@/components/contribute/ContributeTabs";
import { alternates, paths, type Lang } from "@/i18n";

export function contributeMetadata(lang: Lang): Metadata {
  const t = contributeText[lang];
  return {
    title: t.metaTitle,
    description: t.metaDescription,
    alternates: alternates(lang, paths.contribute("vi"), paths.contribute("en")),
  };
}

/** Ai cũng đóng góp được, không cần tài khoản — bài gửi lên chờ admin duyệt rồi mới hiện trên site */
export function ContributeView({ lang }: { lang: Lang }) {
  const t = contributeText[lang];
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-10">
      <div>
        <p className="eyebrow">{t.eyebrow}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          {t.title[0]}
          <span className="highlight">{t.title[1]}</span>
        </h1>
        <p className="mt-2 text-muted">{t.lead}</p>
      </div>

      <ContributeTabs lang={lang} />
    </div>
  );
}
