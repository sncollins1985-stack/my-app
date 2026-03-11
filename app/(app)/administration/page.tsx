import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdministrationPage() {
  return (
    <>
      <AppHeader
        breadcrumbs={[
          { label: "Home", href: "/dashboard" },
          { label: "Administration" },
        ]}
      />
      <div className="flex flex-1 flex-col gap-6 p-6">
        <section className="rounded-xl border bg-card p-5 shadow-sm">
          <h1 className="text-2xl font-semibold tracking-tight">Administration</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure platform-level settings, users, and operating controls.
          </p>
        </section>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Users</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Manage user access and account details.
              <div className="mt-3">
                <Link
                  href="/administration/users"
                  className="inline-flex rounded-md border px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted"
                >
                  Open users
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Permissions</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Placeholder for role- and policy-driven authorization controls.
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Templates</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Placeholder for project templates and default module enablement.
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
