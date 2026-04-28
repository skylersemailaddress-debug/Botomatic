import { ProDashboard } from "@/components/pro/ProDashboard";

export default async function ProjectAdvancedPage({ params }: { params: { projectId: string } }) {
  return <ProDashboard projectId={params.projectId} />;
}
