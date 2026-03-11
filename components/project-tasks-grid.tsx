"use client";

import { KeyboardEvent, MouseEvent, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TaskDrawer } from "@/components/task-drawer";

type TaskPriorityValue = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
type TaskStatusValue = "NOT_STARTED" | "IN_PROGRESS" | "BLOCKED" | "DONE";

type ProjectTaskGridItem = {
  id: string;
  title: string;
  description: string | null;
  assigneeId: string | null;
  assigneeEmail: string | null;
  assigneeFirstName: string | null;
  assigneeLastName: string | null;
  dueDate: string | null;
  priority: TaskPriorityValue;
  status: TaskStatusValue;
  createdAt: string;
};

function formatDate(value: string | null) {
  if (!value) {
    return "No due date";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function formatAssigneeLabel(task: ProjectTaskGridItem) {
  if (!task.assigneeId) {
    return "Unassigned";
  }

  const fullName = [task.assigneeFirstName ?? "", task.assigneeLastName ?? ""]
    .join(" ")
    .trim();

  if (fullName) {
    return fullName;
  }

  return task.assigneeEmail ?? "Assigned";
}

function formatStatus(status: TaskStatusValue) {
  switch (status) {
    case "NOT_STARTED":
      return "Not started";
    case "IN_PROGRESS":
      return "In progress";
    case "BLOCKED":
      return "Blocked";
    case "DONE":
      return "Done";
    default:
      return status;
  }
}

function formatPriority(priority: TaskPriorityValue) {
  switch (priority) {
    case "LOW":
      return "Low";
    case "MEDIUM":
      return "Medium";
    case "HIGH":
      return "High";
    case "CRITICAL":
      return "Critical";
    default:
      return priority;
  }
}

function statusBadgeClassName(status: TaskStatusValue) {
  switch (status) {
    case "DONE":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "IN_PROGRESS":
      return "border-sky-200 bg-sky-50 text-sky-700";
    case "BLOCKED":
      return "border-red-200 bg-red-50 text-red-700";
    case "NOT_STARTED":
    default:
      return "border-zinc-200 bg-zinc-50 text-zinc-700";
  }
}

function priorityBadgeClassName(priority: TaskPriorityValue) {
  switch (priority) {
    case "CRITICAL":
      return "border-red-200 bg-red-50 text-red-700";
    case "HIGH":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "MEDIUM":
      return "border-sky-200 bg-sky-50 text-sky-700";
    case "LOW":
    default:
      return "border-zinc-200 bg-zinc-50 text-zinc-700";
  }
}

interface ProjectTasksGridProps {
  projectId: string;
  tasks: ProjectTaskGridItem[];
}

export function ProjectTasksGrid({ projectId, tasks }: ProjectTasksGridProps) {
  const createButtonRef = useRef<HTMLButtonElement>(null);
  const focusReturnTargetRef = useRef<HTMLElement | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<"create" | "edit">("create");
  const [selectedTask, setSelectedTask] = useState<ProjectTaskGridItem | null>(null);

  function openCreateDrawer(triggerTarget?: HTMLElement | null) {
    focusReturnTargetRef.current = triggerTarget ?? createButtonRef.current;
    setDrawerMode("create");
    setSelectedTask(null);
    setDrawerOpen(true);
  }

  function openTaskDrawer(task: ProjectTaskGridItem, triggerTarget: HTMLElement) {
    focusReturnTargetRef.current = triggerTarget;
    setDrawerMode("edit");
    setSelectedTask(task);
    setDrawerOpen(true);
  }

  function onDrawerOpenChange(nextOpen: boolean) {
    setDrawerOpen(nextOpen);

    if (!nextOpen) {
      const focusTarget = focusReturnTargetRef.current;
      window.requestAnimationFrame(() => {
        focusTarget?.focus();
      });
    }
  }

  function onRowKeyDown(event: KeyboardEvent<HTMLTableRowElement>, task: ProjectTaskGridItem) {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    openTaskDrawer(task, event.currentTarget);
  }

  function onRowClick(event: MouseEvent<HTMLTableRowElement>, task: ProjectTaskGridItem) {
    openTaskDrawer(task, event.currentTarget);
  }

  return (
    <>
      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Tasks</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              View and open project tasks with key delivery metadata.
            </p>
          </div>

          <Button ref={createButtonRef} onClick={(event) => openCreateDrawer(event.currentTarget)}>
            <Plus className="size-4" />
            Create task
          </Button>
        </div>

        <div className="mt-4 overflow-x-auto">
          {tasks.length === 0 ? (
            <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
              No tasks yet. Create the first task for this project.
            </p>
          ) : (
            <table className="min-w-full divide-y divide-border text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="pb-3 pr-4 font-medium">Task</th>
                  <th className="pb-3 pr-4 font-medium">Status</th>
                  <th className="pb-3 pr-4 font-medium">Priority</th>
                  <th className="pb-3 pr-4 font-medium">Assignee</th>
                  <th className="pb-3 pr-4 font-medium">Due</th>
                  <th className="pb-3 pr-4 font-medium">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {tasks.map((task) => (
                  <tr
                    key={task.id}
                    role="button"
                    tabIndex={0}
                    onClick={(event) => onRowClick(event, task)}
                    onKeyDown={(event) => onRowKeyDown(event, task)}
                    className="cursor-pointer transition-colors hover:bg-muted/35 focus-visible:bg-muted/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                    aria-label={`Open task drawer for ${task.title}`}
                  >
                    <td className="max-w-md py-3 pr-4">
                      <p className="font-medium text-foreground">{task.title}</p>
                      {task.description ? (
                        <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                          {task.description}
                        </p>
                      ) : null}
                    </td>
                    <td className="py-3 pr-4">
                      <Badge variant="outline" className={statusBadgeClassName(task.status)}>
                        {formatStatus(task.status)}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4">
                      <Badge variant="outline" className={priorityBadgeClassName(task.priority)}>
                        {formatPriority(task.priority)}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">{formatAssigneeLabel(task)}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{formatDate(task.dueDate)}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{formatDate(task.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <TaskDrawer
        open={drawerOpen}
        mode={drawerMode}
        projectId={projectId}
        task={selectedTask}
        onOpenChange={onDrawerOpenChange}
      />
    </>
  );
}
