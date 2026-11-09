import { CollectionView, collectionMetadata, collectionParams } from "@/views/CollectionView";

export const generateStaticParams = collectionParams;

export async function generateMetadata(props: PageProps<"/[collection]">) {
  return collectionMetadata("vi", (await props.params).collection);
}

export default async function CollectionPage(props: PageProps<"/[collection]">) {
  return <CollectionView lang="vi" collection={(await props.params).collection} />;
}
