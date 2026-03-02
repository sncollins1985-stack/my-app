"use client";

import { FormEvent, useDeferredValue, useState, useSyncExternalStore } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, CircleAlert, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

type UserRecord = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: string;
  lastLoggedIn: string | null;
};

type SortKey = "email" | "name" | "createdAt" | "lastLoggedIn";
type SortDirection = "asc" | "desc";

interface ManageUsersContentProps {
  initialUsers: UserRecord[];
}

const tableDateFormatter = new Intl.DateTimeFormat("en-GB", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
  timeZone: "Europe/London",
});

function formatCreatedAt(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return tableDateFormatter.format(date);
}

function formatLastLoggedIn(value: string | null) {
  if (!value) {
    return "Never";
  }

  return formatCreatedAt(value);
}

function getDisplayName(user: Pick<UserRecord, "firstName" | "lastName">) {
  return [user.firstName.trim(), user.lastName.trim()].filter(Boolean).join(" ");
}

function userExists(users: UserRecord[], email: string) {
  const normalizedEmail = email.trim().toLowerCase();

  return users.some((user) => user.email.trim().toLowerCase() === normalizedEmail);
}

function matchesUserSearch(user: UserRecord, query: string) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return true;
  }

  // Centralize searchable fields here so the filter can grow with the user model.
  const searchableValues = [
    user.email,
    getDisplayName(user),
    user.firstName,
    user.lastName,
    user.createdAt,
    formatCreatedAt(user.createdAt),
    user.lastLoggedIn ?? "",
    formatLastLoggedIn(user.lastLoggedIn),
  ];

  return searchableValues.some((value) =>
    value.toLowerCase().includes(normalizedQuery)
  );
}

function sortUsers(users: UserRecord[], key: SortKey, direction: SortDirection) {
  const sortedUsers = [...users];

  sortedUsers.sort((left, right) => {
    if (key === "createdAt" || key === "lastLoggedIn") {
      const leftValue = key === "createdAt" ? left.createdAt : left.lastLoggedIn;
      const rightValue = key === "createdAt" ? right.createdAt : right.lastLoggedIn;
      const leftTime = leftValue ? new Date(leftValue).getTime() : Number.NEGATIVE_INFINITY;
      const rightTime = rightValue
        ? new Date(rightValue).getTime()
        : Number.NEGATIVE_INFINITY;
      const timeComparison = leftTime - rightTime;

      return direction === "asc" ? timeComparison : -timeComparison;
    }

    const leftValue =
      key === "name" ? getDisplayName(left) : (left[key] ?? "").trim();
    const rightValue =
      key === "name" ? getDisplayName(right) : (right[key] ?? "").trim();
    const textComparison = leftValue.localeCompare(rightValue);

    return direction === "asc" ? textComparison : -textComparison;
  });

  return sortedUsers;
}

export function ManageUsersContent({
  initialUsers,
}: ManageUsersContentProps) {
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const [users, setUsers] = useState(initialUsers);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const filteredUsers = users.filter((user) =>
    matchesUserSearch(user, deferredSearchQuery)
  );
  const sortedUsers = sortUsers(filteredUsers, sortKey, sortDirection);
  const selectedUser = users.find((user) => user.id === selectedUserId) ?? null;

  function onSort(nextSortKey: SortKey) {
    if (sortKey === nextSortKey) {
      setSortDirection((currentDirection) =>
        currentDirection === "asc" ? "desc" : "asc"
      );
      return;
    }

    setSortKey(nextSortKey);
    setSortDirection(
      nextSortKey === "createdAt" || nextSortKey === "lastLoggedIn"
        ? "desc"
        : "asc"
    );
  }

  function renderSortIcon(columnKey: SortKey) {
    if (sortKey !== columnKey) {
      return <ArrowUpDown className="size-4 text-muted-foreground/80" />;
    }

    if (sortDirection === "asc") {
      return <ArrowUp className="size-4" />;
    }

    return <ArrowDown className="size-4" />;
  }

  function getAriaSort(columnKey: SortKey) {
    if (sortKey !== columnKey) {
      return "none";
    }

    return sortDirection === "asc" ? "ascending" : "descending";
  }

  function resetForm() {
    setEmail("");
    setName("");
    setError(null);
  }

  function onInviteOpenChange(open: boolean) {
    setInviteOpen(open);

    if (!open) {
      resetForm();
    }
  }

  function openUserSheet(user: UserRecord) {
    setSelectedUserId(user.id);
    setEditFirstName(user.firstName);
    setEditLastName(user.lastName);
    setEditError(null);
    setEditSuccess(null);
  }

  function onSelectedUserOpenChange(open: boolean) {
    if (!open) {
      setSelectedUserId(null);
      setEditFirstName("");
      setEditLastName("");
      setEditError(null);
      setEditSuccess(null);
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError("Email is required");
      return;
    }

    if (userExists(users, normalizedEmail)) {
      setError("A user with this email already exists");
      return;
    }

    setSaving(true);

    const response = await fetch("/api/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: normalizedEmail,
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
        firstName: createdUser.firstName ?? "",
        lastName: createdUser.lastName ?? "",
        lastLoggedIn:
          typeof createdUser.lastLoggedIn === "string" ? createdUser.lastLoggedIn : null,
        createdAt:
          typeof createdUser.createdAt === "string"
            ? createdUser.createdAt
            : new Date().toISOString(),
      },
      ...current,
    ]);
    resetForm();
    setInviteOpen(false);
  }

  async function onUserSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedUser) {
      return;
    }

    setEditError(null);
    setEditSuccess(null);
    setSavingEdit(true);

    const response = await fetch(`/api/users/${selectedUser.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        firstName: editFirstName,
        lastName: editLastName,
      }),
    });

    setSavingEdit(false);

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setEditError(payload?.error ?? "Unable to update user");
      return;
    }

    setUsers((current) =>
      current.map((user) =>
        user.id === selectedUser.id
          ? {
              ...user,
              firstName: payload.firstName ?? "",
              lastName: payload.lastName ?? "",
            }
          : user
      )
    );
    setEditSuccess("User details updated");
  }

  async function onPreparePasswordReset() {
    if (!selectedUser) {
      return;
    }

    setEditError(null);
    setEditSuccess(null);
    setResettingPassword(true);

    const response = await fetch("/api/auth/password-reset/request", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: selectedUser.email,
      }),
    });

    setResettingPassword(false);

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setEditError(payload?.error ?? "Unable to prepare password reset");
      return;
    }

    setEditSuccess("Password reset email prepared in the dev outbox");
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">Manage users</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create and manage user accounts, update details, and review saved records.
        </p>
      </section>

      <section>
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,26rem)_auto] lg:items-start">
            <div>
              <h2 className="text-lg font-semibold">Users</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {deferredSearchQuery
                  ? `${filteredUsers.length} matching record${
                      filteredUsers.length === 1 ? "" : "s"
                    } of ${users.length}.`
                  : `${users.length} record${users.length === 1 ? "" : "s"} available.`}
              </p>
            </div>

            <div className="relative w-full lg:justify-self-center lg:self-center">
              <label htmlFor="users-search" className="sr-only">
                Search users
              </label>
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="users-search"
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search users by email, name, or other details"
                className="h-10 rounded-full border-border/60 bg-muted/40 pl-9 pr-10 text-center shadow-sm focus:bg-background"
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X className="size-4" />
                </button>
              ) : null}
            </div>

            {mounted ? (
              <Sheet open={inviteOpen} onOpenChange={onInviteOpenChange}>
                <SheetTrigger asChild>
                  <Button className="justify-self-start lg:justify-self-end">Invite user</Button>
                </SheetTrigger>
                <SheetContent side="right" className="sm:max-w-md">
                  <SheetHeader>
                    <SheetTitle>Invite user</SheetTitle>
                    <SheetDescription>
                      Email is required. Name is optional.
                    </SheetDescription>
                  </SheetHeader>

                  <form onSubmit={onSubmit} className="flex flex-1 flex-col px-4 pb-4">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label htmlFor="user-email" className="text-sm font-medium">
                          Email
                        </label>
                        <Input
                          id="user-email"
                          type="email"
                          required
                          value={email}
                          onChange={(event) => setEmail(event.target.value)}
                          placeholder="jane@example.com"
                          aria-invalid={Boolean(error)}
                        />
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="user-name" className="text-sm font-medium">
                          Name
                        </label>
                        <Input
                          id="user-name"
                          value={name}
                          onChange={(event) => setName(event.target.value)}
                          placeholder="Jane Doe"
                        />
                      </div>

                      {error ? <p className="text-sm text-red-600">{error}</p> : null}
                    </div>

                    <SheetFooter className="px-0 pt-6">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => onInviteOpenChange(false)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={saving}>
                        {saving ? "Saving..." : "Invite user"}
                      </Button>
                    </SheetFooter>
                  </form>
                </SheetContent>
              </Sheet>
            ) : (
              <Button className="justify-self-start lg:justify-self-end" disabled>
                Invite user
              </Button>
            )}
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="pb-3 pr-4 font-medium" aria-sort={getAriaSort("email")}>
                    <button
                      type="button"
                      onClick={() => onSort("email")}
                      className="inline-flex items-center gap-2 rounded-md py-1 text-left transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      Email
                      {renderSortIcon("email")}
                    </button>
                  </th>
                  <th className="pb-3 pr-4 font-medium" aria-sort={getAriaSort("name")}>
                    <button
                      type="button"
                      onClick={() => onSort("name")}
                      className="inline-flex items-center gap-2 rounded-md py-1 text-left transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      Name
                      {renderSortIcon("name")}
                    </button>
                  </th>
                  <th
                    className="pb-3 pr-4 font-medium"
                    aria-sort={getAriaSort("lastLoggedIn")}
                  >
                    <button
                      type="button"
                      onClick={() => onSort("lastLoggedIn")}
                      className="inline-flex items-center gap-2 rounded-md py-1 text-left transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      Last logged in
                      {renderSortIcon("lastLoggedIn")}
                    </button>
                  </th>
                  <th className="pb-3 font-medium" aria-sort={getAriaSort("createdAt")}>
                    <button
                      type="button"
                      onClick={() => onSort("createdAt")}
                      className="inline-flex items-center gap-2 rounded-md py-1 text-left transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      Created
                      {renderSortIcon("createdAt")}
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-muted-foreground">
                      No users yet.
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-muted-foreground">
                      No users match your search.
                    </td>
                  </tr>
                ) : (
                  sortedUsers.map((user) => (
                    <tr
                      key={user.id}
                      className="cursor-pointer transition hover:bg-muted/40"
                      onClick={() => openUserSheet(user)}
                    >
                      <td className="py-3 pr-4 font-medium">{user.email}</td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {getDisplayName(user) || "-"}
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {user.lastLoggedIn ? (
                          formatLastLoggedIn(user.lastLoggedIn)
                        ) : (
                          <span className="inline-flex rounded-full bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                            Never
                          </span>
                        )}
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

      {mounted ? (
        <Sheet
          open={Boolean(selectedUser)}
          onOpenChange={onSelectedUserOpenChange}
        >
          <SheetContent side="right" className="sm:max-w-lg">
            <SheetHeader>
              <SheetTitle>{selectedUser?.email ?? "User details"}</SheetTitle>
              <SheetDescription>
                Review this user and update their profile details.
              </SheetDescription>
            </SheetHeader>

            {selectedUser ? (
              <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-4 pb-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border bg-muted/30 p-4">
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="mt-1 text-sm font-medium text-foreground">
                      {selectedUser.email}
                    </p>
                  </div>
                  <div className="rounded-xl border bg-muted/30 p-4">
                    <p className="text-sm text-muted-foreground">Last logged in</p>
                    <p className="mt-1 text-sm font-medium text-foreground">
                      {formatLastLoggedIn(selectedUser.lastLoggedIn)}
                    </p>
                  </div>
                  <div className="rounded-xl border bg-muted/30 p-4 sm:col-span-2">
                    <p className="text-sm text-muted-foreground">Created</p>
                    <p className="mt-1 text-sm font-medium text-foreground">
                      {formatCreatedAt(selectedUser.createdAt)}
                    </p>
                  </div>
                </div>

                <form onSubmit={onUserSave} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="edit-user-first-name">First name</Label>
                    <Input
                      id="edit-user-first-name"
                      value={editFirstName}
                      onChange={(event) => setEditFirstName(event.target.value)}
                      autoComplete="given-name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-user-last-name">Surname</Label>
                    <Input
                      id="edit-user-last-name"
                      value={editLastName}
                      onChange={(event) => setEditLastName(event.target.value)}
                      autoComplete="family-name"
                    />
                  </div>

                  {editError ? <p className="text-sm text-red-600">{editError}</p> : null}
                  {editSuccess ? (
                    <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                      <CircleAlert className="size-4" />
                      <span>{editSuccess}</span>
                    </div>
                  ) : null}

                  <SheetFooter className="px-0 pt-2">
                    <Button type="submit" disabled={savingEdit}>
                      {savingEdit ? "Updating..." : "Update user"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={onPreparePasswordReset}
                      disabled={resettingPassword}
                    >
                      {resettingPassword
                        ? "Preparing reset..."
                        : "Prepare password reset"}
                    </Button>
                    <SheetClose asChild>
                      <Button type="button" variant="ghost">
                        Close
                      </Button>
                    </SheetClose>
                  </SheetFooter>
                </form>
              </div>
            ) : null}
          </SheetContent>
        </Sheet>
      ) : null}
    </div>
  );
}
