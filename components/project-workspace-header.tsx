"use client";

import { AppHeader } from "@/components/app-header";
import {
  buildProjectModuleHref,
  getProjectModuleBySegment,
  getProjectModuleChildBySegment,
} from "@/lib/project-workspace";
import { useSelectedLayoutSegments } from "next/navigation";

interface ProjectWorkspaceHeaderProps {
  projectId: string;
  projectName: string;
}

export function ProjectWorkspaceHeader({
  projectId,
  projectName,
}: ProjectWorkspaceHeaderProps) {
  const segments = useSelectedLayoutSegments();
  const moduleSegment = segments[0] ?? "overview";
  const childSegment = segments[1] ?? null;
  const activeModule = getProjectModuleBySegment(moduleSegment);
  const activeChild = getProjectModuleChildBySegment(activeModule, childSegment);

  const breadcrumbs: { label: string; href?: string }[] = [
    { label: "Home", href: "/dashboard" },
    { label: "Projects", href: "/projects" },
    { label: projectName, href: buildProjectModuleHref(projectId, "overview") },
  ];

  if (activeChild) {
    breadcrumbs.push({
      label: activeModule.label,
      href: buildProjectModuleHref(projectId, activeModule.segment),
    });
    breadcrumbs.push({ label: activeChild.label });
  } else {
    breadcrumbs.push({ label: activeModule.label });
  }

  return <AppHeader breadcrumbs={breadcrumbs} />;
}
