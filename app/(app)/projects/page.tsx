import { AppHeader } from "@/components/app-header";
import { prisma } from "@/lib/prisma";
import { ManageProjectsContent } from "@/components/manage-projects-content";

interface ProjectsPageProps {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}

export default async function ProjectsPage({ searchParams }: ProjectsPageProps) {
  const resolvedSearchParams = await searchParams;
  const openAddProject = resolvedSearchParams?.new === "1";
  const projects = await prisma.project.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <>
      <AppHeader
        breadcrumbs={[
          { label: "Home", href: "/dashboard" },
          { label: "Projects" },
        ]}
      />
      <ManageProjectsContent
        openAddProject={openAddProject}
        initialProjects={projects.map((project) => ({
          id: String(project.id),
          name: project.name,
          description: project.description ?? "",
          createdAt: project.createdAt.toISOString(),
        }))}
      />
    </>
  );
}
