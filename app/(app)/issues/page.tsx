import { GlobalCapabilityPlaceholder } from "@/components/global-capability-placeholder";

export default function IssuesPage() {
  return (
    <GlobalCapabilityPlaceholder
      title="Issues"
      description="A global issue register for triage, ownership, and resolution tracking across delivery teams."
      highlights={["Critical blockers", "Owner accountability", "Resolution aging"]}
    />
  );
}
