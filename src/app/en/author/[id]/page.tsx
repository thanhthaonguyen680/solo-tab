import { AuthorView, authorMetadata } from "@/views/AuthorView";

export async function generateMetadata(props: PageProps<"/en/author/[id]">) {
  return authorMetadata("en", (await props.params).id);
}

export default async function AuthorPage(props: PageProps<"/en/author/[id]">) {
  return <AuthorView lang="en" id={(await props.params).id} />;
}
