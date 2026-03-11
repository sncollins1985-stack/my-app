import Link from "next/link";
import { ArrowRight, ChevronDown, Database, MoreHorizontal, Plus, ShieldCheck, Users } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppHeader } from "@/components/app-header";
import { CreateProjectTrigger } from "@/components/create-project-trigger";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function DashboardPage() {
  const [user, totalUsers, recentProjects] = await Promise.all([
    getCurrentUser(),
    prisma.user.count(),
    prisma.project.findMany({
      orderBy: { createdAt: "desc" },
      take: 4,
      select: { id: true, name: true },
    }),
  ]);

  return (
    <>
      <AppHeader breadcrumbs={[{ label: "Home" }]} />
      <div className="flex flex-1 flex-col gap-6 p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Home</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Signed in as{" "}
              <span className="font-medium text-foreground">{user?.email}</span>
            </p>
          </div>
          <Button asChild className="gap-2">
            <Link href="/administration/users">
              Administration
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total users</CardDescription>
              <CardTitle className="text-3xl">{totalUsers}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="size-4" />
                Prisma-backed user records in SQLite
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Authentication</CardDescription>
              <CardTitle className="text-3xl">Active</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ShieldCheck className="size-4" />
                Session-based access control is enforced for app routes
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Environment</CardDescription>
              <CardTitle className="text-3xl">Local</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Database className="size-4" />
                SQLite and Prisma configured for local development
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <CardTitle>Projects</CardTitle>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-sm text-muted-foreground"
                >
                  <span>Recents</span>
                  <ChevronDown className="size-4" />
                </button>
              </div>
              <button
                type="button"
                aria-label="Project options"
                className="rounded-md p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                <MoreHorizontal className="size-4" />
              </button>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 pb-6">
            <CreateProjectTrigger className="flex items-center gap-4 rounded-lg p-1 transition hover:bg-muted/40 w-full text-left">
              <span className="inline-flex size-12 items-center justify-center rounded-xl border border-dashed border-muted-foreground/60 text-muted-foreground">
                <Plus className="size-5" />
              </span>
              <span className="text-base font-medium text-muted-foreground">Create project</span>
            </CreateProjectTrigger>

            {recentProjects.length === 0 ? (
              <p className="text-sm text-muted-foreground">No projects yet.</p>
            ) : (
              recentProjects.map((project, index) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}/overview`}
                  className="flex items-center gap-4 rounded-lg p-1 transition hover:bg-muted/40"
                >
                  <span
                    className={`inline-flex size-12 items-center justify-center rounded-xl ${
                      index % 2 === 0
                        ? "bg-orange-300 text-orange-950"
                        : "bg-zinc-300 text-zinc-800"
                    }`}
                  >
                    <span className="grid grid-cols-2 gap-1">
                      <span className="size-2 rounded-[2px] bg-current" />
                      <span className="size-2 rounded-[2px] bg-current opacity-75" />
                      <span className="size-2 rounded-[2px] bg-current opacity-60" />
                      <span className="size-2 rounded-[2px] bg-current opacity-40" />
                    </span>
                  </span>
                  <span className="text-base font-medium">{project.name}</span>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>UI review</CardTitle>
            <CardDescription>
              The imported v0 project is an admin shell focused on user management.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm text-muted-foreground">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span>Sidebar and responsive app header</span>
              <Badge variant="secondary">Applied</Badge>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span>Shared tokens, cards, tables, badges, and dropdown menus</span>
              <Badge variant="secondary">Applied</Badge>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span>Users screen adapted from mock state to Prisma-backed data</span>
              <Badge variant="secondary">Integrated</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
