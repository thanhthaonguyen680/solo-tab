import { SongView, songMetadata, songParams } from "@/views/SongView";

/** Trang bài hát ở đường dẫn ngắn (/way-back-home) */
export async function generateStaticParams() {
  return songParams();
}

export async function generateMetadata(props: PageProps<"/en/[slug]">) {
  const { slug } = await props.params;
  return songMetadata("en", slug);
}

export default async function Page(props: PageProps<"/en/[slug]">) {
  const { slug } = await props.params;
  return <SongView lang="en" slug={slug} />;
}
