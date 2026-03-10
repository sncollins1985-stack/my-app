"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ChevronRight, Plus } from "lucide-react";
import { usePathname } from "next/navigation";
import { ForrestLogo } from "@/components/forrest-logo";
import {
  PROJECT_CREATED_EVENT,
} from "@/components/project-create-events";
import { CreateProjectTrigger } from "@/components/create-project-trigger";
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
  SidebarSeparator,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";

interface AppSidebarProps {
  userEmail: string;
}

type ProjectItem = {
  id: string;
  name: string;
};

export function AppSidebar({ userEmail }: AppSidebarProps) {
  const pathname = usePathname();
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [projectsSectionOpen, setProjectsSectionOpen] = useState(() =>
    pathname.startsWith("/projects")
  );
  const [administrationSectionOpen, setAdministrationSectionOpen] = useState(() =>
    pathname.startsWith("/users")
  );
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const administrationOpen = pathname.startsWith("/users");
  const projectsOpen = pathname.startsWith("/projects");
  const activeProjectPath = pathname.startsWith("/projects/")
    ? pathname
    : null;

  useEffect(() => {
    if (projectsOpen) {
      setProjectsSectionOpen(true);
    }
  }, [projectsOpen]);

  useEffect(() => {
    if (administrationOpen) {
      setAdministrationSectionOpen(true);
    }
  }, [administrationOpen]);

  useEffect(() => {
    let active = true;

    async function loadProjects() {
      const response = await fetch("/api/projects");
      if (!response.ok || !active) {
        return;
      }

      const payload = await response.json().catch(() => []);
      if (!Array.isArray(payload)) {
        return;
      }

      setProjects(
        payload
          .map((entry) => ({
            id: String(entry.id),
            name:
              typeof entry.name === "string" && entry.name.trim().length > 0
                ? entry.name.trim()
                : "Unnamed project",
          }))
          .filter((entry) => entry.name.length > 0)
      );
    }

    const handleProjectCreated = () => {
      void loadProjects();
    };

    window.addEventListener(PROJECT_CREATED_EVENT, handleProjectCreated);
    void loadProjects();

    return () => {
      active = false;
      window.removeEventListener(PROJECT_CREATED_EVENT, handleProjectCreated);
    };
  }, []);

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
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>

              <Collapsible
                asChild
                open={projectsSectionOpen}
                onOpenChange={setProjectsSectionOpen}
              >
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      tooltip="Projects"
                      className="group/collapsible"
                    >
                      <span>Projects</span>
                      <ChevronRight className="ml-auto size-4 text-sidebar-foreground/60 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub className="mx-2 border-l-0 px-1.5">
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton asChild>
                          <CreateProjectTrigger className="inline-flex w-full items-center gap-2">
                            <Plus className="size-4" />
                            <span>Create project</span>
                          </CreateProjectTrigger>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      {projects.length === 0 ? (
                        <SidebarMenuSubItem>
                          <span className="text-sidebar-foreground/60 text-sm">
                            No projects yet
                          </span>
                        </SidebarMenuSubItem>
                      ) : (
                        projects.map((project) => (
                          <SidebarMenuSubItem key={project.id}>
                            <SidebarMenuSubButton
                              asChild
                              isActive={activeProjectPath === `/projects/${project.id}`}
                            >
                              <Link
                                href={`/projects/${encodeURIComponent(
                                  project.id
                                )}`}
                              >
                                <span>{project.name}</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))
                      )}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>

              <Collapsible
                asChild
                open={administrationSectionOpen}
                onOpenChange={setAdministrationSectionOpen}
              >
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      tooltip="Administration"
                      className="group/collapsible"
                    >
                      <span>Administration</span>
                      <ChevronRight className="ml-auto size-4 text-sidebar-foreground/60 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub className="mx-2 border-l-0 px-1.5">
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
