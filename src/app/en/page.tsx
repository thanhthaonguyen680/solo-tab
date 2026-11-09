import type { Metadata } from "next";
import { alternates } from "@/i18n";
import { HomeView } from "@/views/HomeView";

export const metadata: Metadata = { alternates: alternates("en", "/", "/en") };

export default function Home() {
  return <HomeView lang="en" />;
}
