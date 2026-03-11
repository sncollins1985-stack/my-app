import { ProjectModulePlaceholder } from "@/components/project-module-placeholder";

export default function ProjectBudgetsPage() {
  return (
    <ProjectModulePlaceholder
      title="Budgets"
      description="Track budget baselines, revisions, and financial variance for this project."
      nextFocus="Add budget line structures and variance alerts."
    />
  );
}
