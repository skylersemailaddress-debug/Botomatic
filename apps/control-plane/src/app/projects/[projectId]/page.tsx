import { BetaHQ } from "@/components/beta-hq/BetaHQ";

export default async function ProjectPage({ params }: { params: { projectId: string } }) {
  return <BetaHQ projectId={params.projectId} />;
}
