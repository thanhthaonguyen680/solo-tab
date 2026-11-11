import { ContributeView, contributeMetadata } from "@/views/ContributeView";

export const metadata = contributeMetadata("en");

export default function ContributePage() {
  return <ContributeView lang="en" />;
}
