import { SongView, songMetadata, songParams } from "@/views/SongView";

export const generateStaticParams = songParams;

export async function generateMetadata(props: PageProps<"/en/song/[slug]">) {
  return songMetadata("en", (await props.params).slug);
}

export default async function SongPage(props: PageProps<"/en/song/[slug]">) {
  return <SongView lang="en" slug={(await props.params).slug} />;
}
