import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppHeader } from "@/components/app-header";
import { ManageUsersContent } from "@/components/manage-users-content";

export default async function UsersPage() {
  const [user, users] = await Promise.all([
    getCurrentUser(),
    prisma.user.findMany({ orderBy: { createdAt: "desc" } }),
  ]);

  return (
    <>
      <AppHeader
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Manage users" },
        ]}
      />
      <ManageUsersContent
        currentUsername={user?.username ?? "admin"}
        initialUsers={users.map((entry) => ({
          id: String(entry.id),
          email: entry.email,
          name: entry.name ?? "",
          createdAt: entry.createdAt.toISOString(),
        }))}
      />
    </>
  );
}
