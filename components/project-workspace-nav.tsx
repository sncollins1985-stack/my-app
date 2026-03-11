"use client";

import Link from "next/link";
import { useSelectedLayoutSegments } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  buildProjectModuleHref,
  getProjectModules,
  ProjectModuleId,
} from "@/lib/project-workspace";

interface ProjectWorkspaceNavProps {
  projectId: string;
  enabledModuleIds?: ProjectModuleId[];
  permissions?: string[];
}

export function ProjectWorkspaceNav({
  projectId,
  enabledModuleIds,
  permissions,
}: ProjectWorkspaceNavProps) {
  const segments = useSelectedLayoutSegments();
  const activeSegment = segments[0] ?? "overview";
  const modules = getProjectModules({ enabledModuleIds, permissions });

  return (
    <nav
      aria-label="Project modules"
      className="rounded-xl border bg-card px-3 py-2 shadow-sm"
    >
      <div className="flex flex-wrap items-center gap-2">
        {modules.map((module) => (
          <Link
            key={module.id}
            href={buildProjectModuleHref(projectId, module.segment)}
            className={cn(
              "inline-flex items-center rounded-md border px-3 py-1.5 text-sm transition",
              activeSegment === module.segment
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {module.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
