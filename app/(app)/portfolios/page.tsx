import { GlobalCapabilityPlaceholder } from "@/components/global-capability-placeholder";

export default function PortfoliosPage() {
  return (
    <GlobalCapabilityPlaceholder
      title="Portfolios"
      description="Portfolio-level oversight across project groups, delivery objectives, and investment themes."
      highlights={["Portfolio health", "Delivery mix", "Cross-project dependencies"]}
    />
  );
}
