import type { Lang } from "@/i18n";
import { HtmlLang } from "./LangSwitch";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

/** Header + nội dung + footer theo ngôn ngữ. `switcher`: hiện nút VI / EN */
export function SiteShell({ lang, switcher = true, children }: { lang: Lang; switcher?: boolean; children: React.ReactNode }) {
  return (
    <>
      <HtmlLang lang={lang} />
      <SiteHeader lang={lang} switcher={switcher} />
      <main className="flex-1">{children}</main>
      <SiteFooter lang={lang} />
    </>
  );
}
