import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

async function getUsers() {
  const res = await fetch("http://localhost:3000/api/users", {
    cache: "no-store",
  });

  if (!res.ok) {
    return [];
  }

  return res.json();
}

export default async function UsersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const users = await getUsers();

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow p-6">
        <h1 className="text-2xl font-semibold mb-2">Manage Users</h1>
        <p className="text-sm text-gray-500 mb-6">
          Logged in as: <strong>{user.username}</strong>
        </p>

        {/* Add user form */}
        <form
          action="/api/users"
          method="post"
          className="flex gap-3 mb-8"
        >
          <input
            name="email"
            placeholder="Email"
            required
            className="border rounded px-3 py-2 flex-1"
          />
          <input
            name="name"
            placeholder="Name (optional)"
            className="border rounded px-3 py-2 flex-1"
          />
          <button
            type="submit"
            className="bg-black text-white px-4 py-2 rounded"
          >
            Add
          </button>
        </form>

        {/* Users list */}
        <h2 className="text-lg font-medium mb-3">Saved Users</h2>

        {users.length === 0 ? (
          <p className="text-gray-400">No users yet.</p>
        ) : (
          <ul className="space-y-3">
            {users.map((u: any) => (
              <li
                key={u.id}
                className="border rounded p-3 flex justify-between items-center"
              >
                <div>
                  <div className="font-medium">{u.email}</div>
                  {u.name && (
                    <div className="text-sm text-gray-500">
                      {u.name}
                    </div>
                  )}
                  <div className="text-xs text-gray-400">
                    {new Date(u.createdAt).toLocaleString()}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-8">
          <form action="/api/auth/logout" method="post">
            <button className="text-sm underline text-gray-500">
              Log out
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}