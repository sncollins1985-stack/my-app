import { prisma } from "@/lib/prisma";
import { AppHeader } from "@/components/app-header";
import { ManageUsersContent } from "@/components/manage-users-content";

export default async function AdministrationUsersPage() {
  const users = await prisma.user.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <>
      <AppHeader
        breadcrumbs={[
          { label: "Home", href: "/dashboard" },
          { label: "Administration", href: "/administration" },
          { label: "Users" },
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
