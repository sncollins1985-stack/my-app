import { ClipboardCheck, Shield, Sparkles } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const assuranceItems = [
  {
    title: "Control reviews",
    description: "Track the status of periodic checks and internal sign-off.",
    icon: Shield,
  },
  {
    title: "Evidence capture",
    description: "Collect and centralize supporting notes for audit activity.",
    icon: ClipboardCheck,
  },
  {
    title: "Process readiness",
    description: "Prepare placeholder workflows for future assurance tooling.",
    icon: Sparkles,
  },
];

export default function AssurancePage() {
  return (
    <>
      <AppHeader
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Assurance" },
        ]}
      />
      <div className="flex flex-1 flex-col gap-6 p-6">
        <section className="rounded-xl border bg-card p-5 shadow-sm">
          <h1 className="text-2xl font-semibold tracking-tight">Assurance</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            A placeholder area for assurance-focused workflows, controls, and review
            activity.
          </p>
        </section>

        <div className="grid gap-4 md:grid-cols-3">
          {assuranceItems.map((item) => {
            const Icon = item.icon;

            return (
              <Card key={item.title}>
                <CardHeader className="pb-3">
                  <CardDescription className="flex items-center gap-2">
                    <Icon className="size-4" />
                    Assurance
                  </CardDescription>
                  <CardTitle>{item.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  {item.description}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </>
  );
}
