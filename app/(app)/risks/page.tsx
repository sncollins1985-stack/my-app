import { GlobalCapabilityPlaceholder } from "@/components/global-capability-placeholder";

export default function RisksPage() {
  return (
    <GlobalCapabilityPlaceholder
      title="Risks"
      description="Cross-cutting risk management for enterprise visibility across projects and portfolios."
      highlights={["Global risk register", "Escalation queue", "Mitigation performance"]}
    />
  );
}
