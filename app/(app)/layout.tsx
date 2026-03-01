import Link from "next/link";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-white p-4 hidden md:flex md:flex-col">
        <div className="flex items-center gap-2 mb-6">
          <div className="h-9 w-9 rounded-xl bg-indigo-600" />
          <div>
            <div className="font-semibold leading-5">My App</div>
            <div className="text-xs text-slate-500">Local dev</div>
          </div>
        </div>

        <nav className="space-y-1">
          <NavItem href="/dashboard" label="Dashboard" />
          <NavItem href="/users" label="Users" />
          <NavItem href="/projects" label="Projects" />
          <NavItem href="/reports" label="Reports" />
          <NavItem href="/settings" label="Settings" />
        </nav>

        <div className="mt-auto pt-6 text-xs text-slate-500">
          v0.1 • SQLite
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col">
        {/* Top bar */}
        <header className="h-14 bg-white border-b px-4 flex items-center gap-3">
          {/* Mobile menu placeholder */}
          <div className="md:hidden font-semibold">My App</div>

          <div className="flex-1 flex items-center">
            <div className="w-full max-w-xl">
              <input
                placeholder="Search users, projects…"
                className="w-full rounded-xl border bg-slate-50 px-4 py-2 outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
          </div>

          {/* Profile */}
          <div className="relative">
            <details className="group">
              <summary className="list-none cursor-pointer flex items-center gap-2">
                <div className="h-9 w-9 rounded-full bg-slate-200 grid place-items-center text-sm font-semibold">
                  S
                </div>
                <div className="hidden sm:block text-sm">
                  <div className="font-medium leading-4">Steve</div>
                  <div className="text-xs text-slate-500">Account</div>
                </div>
              </summary>

              <div className="absolute right-0 mt-2 w-56 rounded-xl border bg-white shadow-lg p-1">
                <MenuItem href="/account" label="My account" />
                <MenuItem href="/account/security" label="Security" />
                <div className="my-1 border-t" />
                <form action="/api/auth/logout" method="post">
                  <button
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 text-sm"
                    type="submit"
                  >
                    Log out
                  </button>
                </form>
              </div>
            </details>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}

function NavItem({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="block rounded-xl px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
    >
      {label}
    </Link>
  );
}

function MenuItem({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="block px-3 py-2 rounded-lg hover:bg-slate-50 text-sm"
    >
      {label}
    </Link>
  );
}