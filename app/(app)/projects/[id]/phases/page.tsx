import { ProjectModulePlaceholder } from "@/components/project-module-placeholder";

export default function ProjectPhasesPage() {
  return (
    <ProjectModulePlaceholder
      title="Phases"
      description="Define delivery phases, gate reviews, and readiness criteria for each transition."
      nextFocus="Add phase templates with stage gates and owner sign-off requirements."
    />
  );
}
