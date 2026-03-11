import { ProjectModulePlaceholder } from "@/components/project-module-placeholder";

export default function ProjectSettingsPage() {
  return (
    <ProjectModulePlaceholder
      title="Settings"
      description="Configure project-specific defaults, module controls, and workspace behavior."
      nextFocus="Add module enablement controls and project template overrides."
    />
  );
}
