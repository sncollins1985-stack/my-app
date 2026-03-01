import Link from "next/link";
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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";

interface AppSidebarProps {
  username: string;
}

export function AppSidebar({ username }: AppSidebarProps) {
  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center justify-center px-2 py-3">
          <ForrestLogo className="size-14" />
          <span className="sr-only">Forrest admin dashboard</span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Dashboard">
                  <Link href="/dashboard">
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton tooltip="Administration">
                  <span>Administration</span>
                </SidebarMenuButton>
                <SidebarMenuSub>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton asChild>
                      <Link href="/users">
                        <span>Manage users</span>
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                </SidebarMenuSub>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Assurance">
                  <Link href="/assurance">
                    <span>Assurance</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarSeparator />

      <SidebarFooter className="p-2">
        <div className="rounded-lg border border-sidebar-border bg-sidebar-accent/40 p-3 text-sm">
          <p className="text-sidebar-foreground/60">Signed in as</p>
          <p className="font-medium text-sidebar-foreground">{username}</p>
          <form action="/api/auth/logout" method="post" className="mt-3">
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
