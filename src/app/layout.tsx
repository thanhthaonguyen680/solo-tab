import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Chakra_Petch, JetBrains_Mono, Zalando_Sans } from "next/font/google";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { site } from "@/config/site";
import "./globals.css";

const zalando = Zalando_Sans({
  variable: "--font-zalando",
  subsets: ["latin", "vietnamese"],
});

const chakra = Chakra_Petch({
  variable: "--font-chakra",
  subsets: ["latin", "vietnamese"],
  weight: ["500", "600", "700"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: `${site.name} — ${site.tagline}`, template: `%s · ${site.name}` },
  description: site.description,
  metadataBase: new URL(site.url),
  applicationName: site.name,
  authors: [{ name: site.owner }],
  creator: site.owner,
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" className={`${zalando.variable} ${chakra.variable} ${jetbrains.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
        <Analytics />
      </body>
    </html>
  );
}
