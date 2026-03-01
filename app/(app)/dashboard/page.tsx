import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="mt-2 opacity-80">Logged in as: {user.username}</p>

      <div className="mt-6 flex gap-4 items-center">
        <Link className="underline" href="/users">
          Manage users
        </Link>

        <form action="/api/auth/logout" method="post">
          <button className="underline" type="submit">
            Log out
          </button>
        </form>
      </div>
    </main>
  );
}