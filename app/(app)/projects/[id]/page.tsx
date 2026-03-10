import { notFound } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { prisma } from "@/lib/prisma";

interface ProjectSummaryPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ProjectSummaryPage({ params }: ProjectSummaryPageProps) {
  const resolvedParams = await params;
  const id = Number(resolvedParams.id);

  if (!Number.isInteger(id) || id <= 0) {
    notFound();
  }

  const project = await prisma.project.findUnique({
    where: { id },
  });

  if (!project) {
    notFound();
  }

  return (
    <>
      <AppHeader
        breadcrumbs={[
          { label: "Home", href: "/dashboard" },
          { label: "Projects", href: "/projects" },
          { label: project.name },
        ]}
      />
      <div className="flex flex-1 flex-col gap-6 p-6">
        <section className="rounded-xl border bg-card p-5 shadow-sm">
          <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">
            {project.description ? project.description : "No description yet."}
          </p>
        </section>

        <section className="rounded-xl border bg-card p-5">
          <h2 className="text-lg font-semibold">Summary placeholder</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Project summary is ready for expansion.
          </p>
        </section>
      </div>
    </>
  );
}
