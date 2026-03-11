import { ProjectModulePlaceholder } from "@/components/project-module-placeholder";

export default function ProjectInvoicesPage() {
  return (
    <ProjectModulePlaceholder
      title="Invoices"
      description="Track invoice intake, validation, and payment readiness against approved scope."
      nextFocus="Add invoice matching to orders and budget commitments."
    />
  );
}
