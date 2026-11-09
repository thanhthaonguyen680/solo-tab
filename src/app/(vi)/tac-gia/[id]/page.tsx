import { AuthorView, authorMetadata } from "@/views/AuthorView";

export async function generateMetadata(props: PageProps<"/tac-gia/[id]">) {
  return authorMetadata("vi", (await props.params).id);
}

export default async function AuthorPage(props: PageProps<"/tac-gia/[id]">) {
  return <AuthorView lang="vi" id={(await props.params).id} />;
}
