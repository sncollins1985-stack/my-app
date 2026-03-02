import Link from "next/link";
import { ArrowRight, Database, ShieldCheck, Users } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppHeader } from "@/components/app-header";
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
  const [user, totalUsers] = await Promise.all([
    getCurrentUser(),
    prisma.user.count(),
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
            <Link href="/users">
              Manage users
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
