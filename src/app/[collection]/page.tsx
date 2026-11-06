import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SongBrowser } from "@/components/SongBrowser";
import { collections, isCollectionSlug, site } from "@/config/site";
import { getSongs } from "@/lib/songs";

export function generateStaticParams() {
  return Object.keys(collections).map((collection) => ({ collection }));
}

export async function generateMetadata(props: PageProps<"/[collection]">): Promise<Metadata> {
  const { collection } = await props.params;
  if (!isCollectionSlug(collection)) return {};
  return { title: collections[collection].title, description: collections[collection].blurb };
}

export default async function CollectionPage(props: PageProps<"/[collection]">) {
  const { collection } = await props.params;
  if (!isCollectionSlug(collection)) notFound();

  const info = collections[collection];
  const songs = getSongs(collection);

  return (
    <>
      <section className="strings border-b border-border">
        <div className="mx-auto flex max-w-5xl flex-col gap-2 px-4 py-10">
          <Link href="/" className="w-fit text-sm text-muted hover:text-text">
            ← Trang chủ
          </Link>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-3xl font-bold sm:text-4xl">
                {site.name} <span className="text-accent">{info.title}</span>
              </h1>
              <p className="mt-1 text-muted">{info.blurb}</p>
            </div>
            <a href={site.contact.href} className="text-sm text-muted hover:text-accent">
              Chưa có bài bạn cần? Yêu cầu bài →
            </a>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 pb-16">
        <SongBrowser songs={songs} />
      </div>
    </>
  );
}
