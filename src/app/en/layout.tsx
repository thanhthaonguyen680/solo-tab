import type { Metadata } from "next";
import { SiteShell } from "@/components/SiteShell";
import { site } from "@/config/site";
import { dict } from "@/i18n";

export const metadata: Metadata = {
  title: { absolute: `${site.name} — ${dict.en.tagline}`, template: `%s · ${site.name}` },
  description: dict.en.description,
  openGraph: { locale: "en_US" },
};

/** Site tiếng Anh — /en/… */
export default function EnglishLayout({ children }: LayoutProps<"/en">) {
  return <SiteShell lang="en">{children}</SiteShell>;
}
