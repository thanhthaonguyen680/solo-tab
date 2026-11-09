import { SongView, songMetadata, songParams } from "@/views/SongView";

export const generateStaticParams = songParams;

export async function generateMetadata(props: PageProps<"/bai/[slug]">) {
  return songMetadata("vi", (await props.params).slug);
}

export default async function SongPage(props: PageProps<"/bai/[slug]">) {
  return <SongView lang="vi" slug={(await props.params).slug} />;
}
