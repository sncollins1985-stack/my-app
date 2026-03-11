import { AppHeader } from "@/components/app-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface GlobalCapabilityPlaceholderProps {
  title: string;
  description: string;
  highlights: string[];
}

export function GlobalCapabilityPlaceholder({
  title,
  description,
  highlights,
}: GlobalCapabilityPlaceholderProps) {
  return (
    <>
      <AppHeader
        breadcrumbs={[
          { label: "Home", href: "/dashboard" },
          { label: title },
        ]}
      />
      <div className="flex flex-1 flex-col gap-6 p-6">
        <section className="rounded-xl border bg-card p-5 shadow-sm">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </section>

        <div className="grid gap-4 md:grid-cols-3">
          {highlights.map((item) => (
            <Card key={item}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{item}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Placeholder ready for future implementation.
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}
