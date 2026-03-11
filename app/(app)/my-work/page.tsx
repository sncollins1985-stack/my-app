import { GlobalCapabilityPlaceholder } from "@/components/global-capability-placeholder";

export default function MyWorkPage() {
  return (
    <GlobalCapabilityPlaceholder
      title="My Work"
      description="A personal workspace for assigned tasks, priorities, and due work across projects."
      highlights={["Assigned tasks", "Upcoming deadlines", "Workload view"]}
    />
  );
}
