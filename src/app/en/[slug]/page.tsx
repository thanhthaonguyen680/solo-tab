import { isCollectionSlug } from "@/config/site";
import { CollectionView, collectionMetadata, collectionParams } from "@/views/CollectionView";
import { SongView, songMetadata, songParams } from "@/views/SongView";

/** Một cấp đường dẫn cho cả kho bài (/solo, /melody) lẫn bài hát (/way-back-home) */
export async function generateStaticParams() {
  return [...collectionParams().map((p) => ({ slug: p.collection })), ...(await songParams())];
}

export async function generateMetadata(props: PageProps<"/en/[slug]">) {
  const { slug } = await props.params;
  return isCollectionSlug(slug) ? collectionMetadata("en", slug) : songMetadata("en", slug);
}

export default async function Page(props: PageProps<"/en/[slug]">) {
  const { slug } = await props.params;
  return isCollectionSlug(slug) ? <CollectionView lang="en" collection={slug} /> : <SongView lang="en" slug={slug} />;
}
