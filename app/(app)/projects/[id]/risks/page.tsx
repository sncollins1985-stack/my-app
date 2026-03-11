import { ProjectModulePlaceholder } from "@/components/project-module-placeholder";

export default function ProjectRisksPage() {
  return (
    <ProjectModulePlaceholder
      title="Risks"
      description="Maintain the project risk register with impact, likelihood, and mitigation actions."
      nextFocus="Add scoring models, owners, and escalation thresholds."
    />
  );
}
