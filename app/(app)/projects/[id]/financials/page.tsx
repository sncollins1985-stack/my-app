import Link from "next/link";
import { ProjectModulePlaceholder } from "@/components/project-module-placeholder";
import { buildProjectModuleChildHref } from "@/lib/project-workspace";

interface ProjectFinancialsPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ProjectFinancialsPage({ params }: ProjectFinancialsPageProps) {
  const resolvedParams = await params;

  return (
    <ProjectModulePlaceholder
      title="Financials"
      description="Financials is the parent area for project commercial controls and delivery spend."
      nextFocus="Connect budgets, orders, and invoices with governance and approval workflows."
    >
      <div className="grid gap-3 md:grid-cols-3">
        <Link
          href={buildProjectModuleChildHref(resolvedParams.id, "financials", "budgets")}
          className="rounded-lg border px-3 py-2 text-sm text-foreground transition hover:bg-muted"
        >
          Budgets
        </Link>
        <Link
          href={buildProjectModuleChildHref(resolvedParams.id, "financials", "orders")}
          className="rounded-lg border px-3 py-2 text-sm text-foreground transition hover:bg-muted"
        >
          Orders
        </Link>
        <Link
          href={buildProjectModuleChildHref(resolvedParams.id, "financials", "invoices")}
          className="rounded-lg border px-3 py-2 text-sm text-foreground transition hover:bg-muted"
        >
          Invoices
        </Link>
      </div>
    </ProjectModulePlaceholder>
  );
}
