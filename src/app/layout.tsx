import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Chakra_Petch, JetBrains_Mono, Zalando_Sans } from "next/font/google";
import { site } from "@/config/site";
import "./globals.css";

const zalando = Zalando_Sans({
  variable: "--font-zalando",
  subsets: ["latin", "vietnamese"],
});

// Font tiêu đề: cả site chỉ dùng độ đậm 600 (h1, h2, logo…) → tải đúng 1 độ đậm thay vì 3
const chakra = Chakra_Petch({
  variable: "--font-chakra",
  subsets: ["latin", "vietnamese"],
  weight: "600",
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
        {/* Header / footer nằm ở layout của từng ngôn ngữ: (vi), en, admin */}
        {children}
        <Analytics />
      </body>
    </html>
  );
}
