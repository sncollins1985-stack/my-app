import { GlobalCapabilityPlaceholder } from "@/components/global-capability-placeholder";

export default function ApprovalsPage() {
  return (
    <GlobalCapabilityPlaceholder
      title="Approvals"
      description="Cross-cutting approval workflows spanning projects, financials, risks, and governance controls."
      highlights={["Pending approvals", "Escalated approvals", "Recent decisions"]}
    />
  );
}
