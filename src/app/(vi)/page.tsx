import type { Metadata } from "next";
import { alternates } from "@/i18n";
import { HomeView } from "@/views/HomeView";

export const metadata: Metadata = { alternates: alternates("vi", "/", "/en") };

export default function Home() {
  return <HomeView lang="vi" />;
}
