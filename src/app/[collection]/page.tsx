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
  const songs = await getSongs(collection);

  return (
    <>
      <section className="strings">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-12">
          <Link href="/" className="w-fit text-sm text-muted hover:text-text">
            ← Trang chủ
          </Link>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="eyebrow">{site.name}</p>
              <h1 className="mt-2 text-4xl sm:text-5xl">{info.title}</h1>
              <p className="mt-2 text-lg text-muted">{info.blurb}</p>
            </div>
            <a href={site.contact.href} className="text-sm font-semibold text-accent-ink underline-offset-4 hover:underline">
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
