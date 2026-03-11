"use client";

import { FormEvent, KeyboardEvent, useEffect, useState } from "react";
import { CircleAlert, Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

type ProjectRecord = {
  id: string;
  name: string;
  description: string;
  createdAt: string;
};

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function normalizeProjectName(value: string) {
  return value.trim();
}

interface ManageProjectsContentProps {
  initialProjects: ProjectRecord[];
  openAddProject?: boolean;
}

export function ManageProjectsContent({
  initialProjects,
  openAddProject = false,
}: ManageProjectsContentProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [projects, setProjects] = useState<ProjectRecord[]>(initialProjects);
  const [addProjectOpen, setAddProjectOpen] = useState(openAddProject);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (openAddProject) {
      setAddProjectOpen(true);
    }
  }, [openAddProject]);

  useEffect(() => {
    setProjects(initialProjects);
  }, [initialProjects]);

  function clearAddProjectQuery() {
    const params = new URLSearchParams(searchParams.toString());

    if (!params.has("new")) {
      return;
    }

    params.delete("new");
    const nextSearch = params.toString();
    const next = nextSearch ? `${pathname}?${nextSearch}` : pathname;

    router.replace(next, { scroll: false });
  }

  const filteredProjects = projects.filter((project) => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return true;
    }

    const searchable = [project.name, project.description, project.createdAt];

    return searchable.some((value) => value.toLowerCase().includes(normalizedQuery));
  });

  function resetForm() {
    setName("");
    setDescription("");
    setError(null);
  }

  function onAddProjectOpenChange(open: boolean) {
    setAddProjectOpen(open);

    if (!open) {
      clearAddProjectQuery();
      resetForm();
    }
  }

  function openProjectWorkspace(projectId: string) {
    router.push(`/projects/${encodeURIComponent(projectId)}/overview`);
  }

  function onProjectRowKeyDown(event: KeyboardEvent<HTMLTableRowElement>, projectId: string) {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    openProjectWorkspace(projectId);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const normalizedName = normalizeProjectName(name);

    if (!normalizedName) {
      setError("Project name is required");
      return;
    }

    setSaving(true);
    const normalizedDescription = description.trimEnd();

    const response = await fetch("/api/projects", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: normalizedName,
        description: normalizedDescription,
      }),
    });

    setSaving(false);

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setError(payload?.error ?? "Failed to create project");
      return;
    }

    const createdProject = await response.json();
    const createdProjectName =
      typeof createdProject?.name === "string" ? createdProject.name.trim() : "";
    const createdProjectDescription =
      typeof createdProject?.description === "string"
        ? createdProject.description
        : "";

    if (!createdProjectName) {
      setError("Project creation response was invalid");
      return;
    }

    setProjects((current) => [
      {
        id: String(createdProject.id ?? crypto.randomUUID()),
        name: createdProjectName,
        description: createdProjectDescription,
        createdAt:
          typeof createdProject.createdAt === "string"
            ? createdProject.createdAt
            : new Date().toISOString(),
      },
      ...current,
    ]);

    resetForm();
    onAddProjectOpenChange(false);
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Discover projects and open each workspace from this index.
        </p>
      </section>

      <section>
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Project list</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {projects.length === 0
                  ? "No projects yet."
                  : `${filteredProjects.length} visible project${
                      filteredProjects.length === 1 ? "" : "s"
                    }.`}
              </p>
            </div>

            <div className="relative w-full sm:w-72">
              <label htmlFor="project-search" className="sr-only">
                Search projects
              </label>
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="project-search"
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search projects"
                className="h-9 rounded-md border-border/60 bg-muted/30 pl-9 pr-10 text-sm shadow-none focus:bg-background"
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
          </div>

          <div className="mt-4 overflow-x-auto">
            {projects.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No projects have been added yet.
              </p>
            ) : filteredProjects.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No projects match your search.
              </p>
            ) : (
              <table className="min-w-full divide-y divide-border text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="pb-3 pr-4 font-medium">Project</th>
                    <th className="pb-3 pr-4 font-medium">Description</th>
                    <th className="pb-3 pr-4 font-medium">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredProjects.map((project) => (
                    <tr
                      key={project.id}
                      role="link"
                      tabIndex={0}
                      onClick={() => openProjectWorkspace(project.id)}
                      onKeyDown={(event) => onProjectRowKeyDown(event, project.id)}
                      className="cursor-pointer transition-colors hover:bg-muted/40 focus-visible:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                      aria-label={`Open ${project.name} workspace`}
                    >
                      <td className="py-3 pr-4 font-medium">{project.name}</td>
                      <td className="max-w-md py-3 pr-4 text-muted-foreground whitespace-pre-wrap">
                        {project.description || "-"}
                      </td>
                      <td className="py-3 text-muted-foreground">
                        {formatDate(project.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </section>

      <Dialog open={addProjectOpen} onOpenChange={onAddProjectOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add project</DialogTitle>
            <DialogDescription>
              Name is required. Description is optional.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={onSubmit} className="flex flex-1 flex-col px-4 pb-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="project-name">Project name</Label>
                <Input
                  id="project-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Quarterly planning"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="project-description">Description</Label>
                <Textarea
                  id="project-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Optional summary of scope, milestones, or notes"
                  rows={4}
                  className="resize-y"
                />
              </div>

              {error ? (
                <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  <CircleAlert className="size-4" />
                  <span>{error}</span>
                </div>
              ) : null}
            </div>

            <DialogFooter className="px-0 pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => onAddProjectOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Add project"}
                  </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
