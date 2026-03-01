"use client";

import { FormEvent, useState } from "react";

type UserRecord = {
  id: string;
  email: string;
  name: string;
  createdAt: string;
};

interface ManageUsersContentProps {
  currentUsername: string;
  initialUsers: UserRecord[];
}

function formatCreatedAt(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

export function ManageUsersContent({
  currentUsername,
  initialUsers,
}: ManageUsersContentProps) {
  const [users, setUsers] = useState(initialUsers);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaving(true);

    const response = await fetch("/api/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        name,
      }),
    });

    setSaving(false);

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setError(payload?.error ?? "Failed to create user");
      return;
    }

    const createdUser = await response.json();

    setUsers((current) => [
      {
        id: String(createdUser.id),
        email: createdUser.email,
        name: createdUser.name ?? "",
        createdAt:
          typeof createdUser.createdAt === "string"
            ? createdUser.createdAt
            : new Date().toISOString(),
      },
      ...current,
    ]);
    setEmail("");
    setName("");
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <p className="text-sm text-muted-foreground">Signed in as {currentUsername}</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Manage users</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create Prisma-backed users and review the records already stored in SQLite.
        </p>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Add user</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Email is required. Name is optional.
          </p>

          <form onSubmit={onSubmit} className="mt-4 space-y-3">
            <div className="space-y-2">
              <label htmlFor="user-email" className="text-sm font-medium">
                Email
              </label>
              <input
                id="user-email"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-ring"
                placeholder="jane@example.com"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="user-name" className="text-sm font-medium">
                Name
              </label>
              <input
                id="user-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-ring"
                placeholder="Jane Doe"
              />
            </div>

            {error ? <p className="text-sm text-red-600">{error}</p> : null}

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving..." : "Create user"}
            </button>
          </form>
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Saved users</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {users.length} record{users.length === 1 ? "" : "s"} available.
              </p>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="pb-3 pr-4 font-medium">Email</th>
                  <th className="pb-3 pr-4 font-medium">Name</th>
                  <th className="pb-3 font-medium">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-6 text-center text-muted-foreground">
                      No users saved yet.
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id}>
                      <td className="py-3 pr-4 font-medium">{user.email}</td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {user.name || "-"}
                      </td>
                      <td className="py-3 text-muted-foreground">
                        {formatCreatedAt(user.createdAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
