"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ForrestLogo } from "@/components/forrest-logo";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

interface AppSidebarProps {
  userEmail: string;
}

type GlobalNavItem = {
  label: string;
  href: string;
  isActive: (pathname: string) => boolean;
};

const GLOBAL_NAV_ITEMS: GlobalNavItem[] = [
  {
    label: "Home",
    href: "/dashboard",
    isActive: (pathname) => pathname === "/dashboard",
  },
  {
    label: "My Work",
    href: "/my-work",
    isActive: (pathname) => pathname === "/my-work" || pathname.startsWith("/my-work/"),
  },
  {
    label: "Approvals",
    href: "/approvals",
    isActive: (pathname) =>
      pathname === "/approvals" ||
      pathname.startsWith("/approvals/") ||
      pathname === "/assurance" ||
      pathname.startsWith("/assurance/"),
  },
  {
    label: "Projects",
    href: "/projects",
    isActive: (pathname) => pathname === "/projects" || pathname.startsWith("/projects/"),
  },
  {
    label: "Portfolios",
    href: "/portfolios",
    isActive: (pathname) => pathname === "/portfolios" || pathname.startsWith("/portfolios/"),
  },
  {
    label: "Risks",
    href: "/risks",
    isActive: (pathname) => pathname === "/risks" || pathname.startsWith("/risks/"),
  },
  {
    label: "Issues",
    href: "/issues",
    isActive: (pathname) => pathname === "/issues" || pathname.startsWith("/issues/"),
  },
  {
    label: "Reports",
    href: "/reports",
    isActive: (pathname) => pathname === "/reports" || pathname.startsWith("/reports/"),
  },
  {
    label: "Administration",
    href: "/administration",
    isActive: (pathname) =>
      pathname === "/administration" ||
      pathname.startsWith("/administration/") ||
      pathname === "/users" ||
      pathname.startsWith("/users/"),
  },
];

export function AppSidebar({ userEmail }: AppSidebarProps) {
  const pathname = usePathname();
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);

  if (!mounted) {
    return (
      <Sidebar className="overflow-hidden">
        <SidebarHeader className="border-b border-sidebar-border">
          <div className="flex items-center justify-center px-2 py-3">
            <ForrestLogo className="size-14" />
            <span className="sr-only">Forrest project workspace</span>
          </div>
        </SidebarHeader>
        <SidebarContent className="overflow-x-hidden pb-4" />
        <SidebarFooter className="mt-auto shrink-0 border-t border-sidebar-border bg-sidebar/95 p-2 backdrop-blur supports-[backdrop-filter]:bg-sidebar/80">
          <div className="rounded-lg border border-sidebar-border bg-sidebar-accent/40 p-3 text-sm">
            <p className="text-sidebar-foreground/60">Signed in as</p>
            <p className="font-medium text-sidebar-foreground">{userEmail}</p>
          </div>
        </SidebarFooter>
      </Sidebar>
    );
  }

  return (
    <Sidebar className="overflow-hidden">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center justify-center px-2 py-3">
          <ForrestLogo className="size-14" />
          <span className="sr-only">Forrest project workspace</span>
        </div>
      </SidebarHeader>

      <SidebarContent className="overflow-x-hidden pb-4">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {GLOBAL_NAV_ITEMS.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    tooltip={item.label}
                    isActive={item.isActive(pathname)}
                  >
                    <Link href={item.href}>
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="mt-auto shrink-0 border-t border-sidebar-border bg-sidebar/95 p-2 backdrop-blur supports-[backdrop-filter]:bg-sidebar/80">
        <div className="rounded-lg border border-sidebar-border bg-sidebar-accent/40 p-3 text-sm">
          <p className="text-sidebar-foreground/60">Signed in as</p>
          <p className="font-medium text-sidebar-foreground">{userEmail}</p>
          <div className="mt-3 flex flex-col gap-2">
            <Link
              href="/profile"
              className="w-full rounded-md border border-sidebar-border px-3 py-2 text-left text-sidebar-foreground transition hover:bg-sidebar-accent"
            >
              My profile
            </Link>
          </div>
          <form action="/api/auth/logout" method="post" className="mt-2">
            <button
              type="submit"
              className="w-full rounded-md border border-sidebar-border px-3 py-2 text-left text-sidebar-foreground transition hover:bg-sidebar-accent"
            >
              Sign out
            </button>
          </form>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
