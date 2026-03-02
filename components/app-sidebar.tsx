"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { usePathname } from "next/navigation";
import { ForrestLogo } from "@/components/forrest-logo";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";

interface AppSidebarProps {
  userEmail: string;
}

export function AppSidebar({ userEmail }: AppSidebarProps) {
  const pathname = usePathname();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const administrationOpen = pathname.startsWith("/users");

  if (!mounted) {
    return (
      <Sidebar className="overflow-hidden">
        <SidebarHeader className="border-b border-sidebar-border">
          <div className="flex items-center justify-center px-2 py-3">
            <ForrestLogo className="size-14" />
            <span className="sr-only">Forrest admin dashboard</span>
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
          <span className="sr-only">Forrest admin dashboard</span>
        </div>
      </SidebarHeader>

      <SidebarContent className="overflow-x-hidden pb-4">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  tooltip="Home"
                  isActive={pathname === "/dashboard"}
                >
                  <Link href="/dashboard">
                    <span>Home</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  tooltip="Assurance"
                  isActive={pathname === "/assurance"}
                >
                  <Link href="/assurance">
                    <span>Assurance</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <Collapsible asChild defaultOpen={administrationOpen}>
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      tooltip="Administration"
                      isActive={pathname.startsWith("/users")}
                      className="group/collapsible"
                    >
                      <span>Administration</span>
                      <ChevronRight className="ml-auto size-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton
                          asChild
                          isActive={pathname === "/users"}
                        >
                          <Link href="/users">
                            <span>Manage users</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
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
