import { SongView, songMetadata, songParams } from "@/views/SongView";

/** Trang bài hát ở đường dẫn ngắn (/way-back-home) */
export async function generateStaticParams() {
  return songParams();
}

export async function generateMetadata(props: PageProps<"/[slug]">) {
  const { slug } = await props.params;
  return songMetadata("vi", slug);
}

export default async function Page(props: PageProps<"/[slug]">) {
  const { slug } = await props.params;
  return <SongView lang="vi" slug={slug} />;
}
