import { notFound } from "next/navigation";
import { ProjectWorkspaceHeader } from "@/components/project-workspace-header";
import { ProjectWorkspaceNav } from "@/components/project-workspace-nav";
import { prisma, prismaModelHasField } from "@/lib/prisma";
import { parseEntityIdentifier } from "@/lib/entity-id";
import { getRouteId } from "@/lib/route-id";

interface ProjectWorkspaceLayoutProps {
  children: React.ReactNode;
  params: Promise<{
    id: string;
  }>;
}

export default async function ProjectWorkspaceLayout({
  children,
  params,
}: ProjectWorkspaceLayoutProps) {
  const resolvedParams = await params;
  const identifier = parseEntityIdentifier(resolvedParams.id);
  if (!identifier) {
    notFound();
  }

  const supportsProjectUuid = prismaModelHasField("Project", "uuid");
  if (identifier.kind === "uuid" && !supportsProjectUuid) {
    notFound();
  }

  const project = await prisma.project.findUnique({
    where:
      identifier.kind === "uuid"
        ? { uuid: identifier.uuid }
        : { id: identifier.id },
  });

  if (!project) {
    notFound();
  }

  const projectId = getRouteId(project);

  return (
    <>
      <ProjectWorkspaceHeader projectId={projectId} projectName={project.name} />
      <div className="flex flex-1 flex-col gap-6 p-6">
        <section className="rounded-xl border bg-card p-5 shadow-sm">
          <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
          <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
            {project.description ? project.description : "No description yet."}
          </p>
        </section>
        <ProjectWorkspaceNav projectId={projectId} />
        {children}
      </div>
    </>
  );
}
