import { prisma } from "@/lib/prisma";
import { AppHeader } from "@/components/app-header";
import { ManageUsersContent } from "@/components/manage-users-content";

export default async function UsersPage() {
  const users = await prisma.user.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <>
      <AppHeader
        breadcrumbs={[
          { label: "Home", href: "/dashboard" },
          { label: "Manage users" },
        ]}
      />
      <ManageUsersContent
        initialUsers={users.map((entry) => ({
          id: String(entry.id),
          email: entry.email,
          firstName: entry.firstName ?? "",
          lastName: entry.lastName ?? "",
          lastLoggedIn: entry.lastLoggedIn?.toISOString() ?? null,
          createdAt: entry.createdAt.toISOString(),
        }))}
      />
    </>
  );
}
