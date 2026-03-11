import { redirect } from "next/navigation";

interface ProjectSummaryPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ProjectSummaryPage({ params }: ProjectSummaryPageProps) {
  const resolvedParams = await params;
  const encodedProjectId = encodeURIComponent(resolvedParams.id);

  redirect(`/projects/${encodedProjectId}/overview`);
}
