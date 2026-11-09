import { CollectionView, collectionMetadata, collectionParams } from "@/views/CollectionView";

export const generateStaticParams = collectionParams;

export async function generateMetadata(props: PageProps<"/en/[collection]">) {
  return collectionMetadata("en", (await props.params).collection);
}

export default async function CollectionPage(props: PageProps<"/en/[collection]">) {
  return <CollectionView lang="en" collection={(await props.params).collection} />;
}
