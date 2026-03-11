import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { prisma, prismaModelHasField } from "@/lib/prisma";
import { EntityIdentifier, parseEntityIdentifier } from "@/lib/entity-id";
import { getRouteId } from "@/lib/route-id";

type TaskPriorityValue = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
type TaskStatusValue = "NOT_STARTED" | "IN_PROGRESS" | "BLOCKED" | "DONE";

type TaskDetailRecord = {
  id: string;
  title: string;
  description: string | null;
  assigneeId: string | null;
  assigneeEmail: string | null;
  assigneeFirstName: string | null;
  assigneeLastName: string | null;
  dueDate: Date | null;
  priority: TaskPriorityValue;
  status: TaskStatusValue;
  projectId: string | null;
  createdAt: Date;
  createdByEmail: string;
};

function formatDate(value: Date | null) {
  if (!value) {
    return "Not set";
  }

  if (Number.isNaN(value.getTime())) {
    return String(value);
  }

  return value.toLocaleString("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
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

function formatAssignee(task: TaskDetailRecord) {
  if (!task.assigneeId) {
    return "Unassigned";
  }

  const fullName = [task.assigneeFirstName ?? "", task.assigneeLastName ?? ""]
    .join(" ")
    .trim();

  if (fullName && task.assigneeEmail) {
    return `${fullName} (${task.assigneeEmail})`;
  }

  return fullName || task.assigneeEmail || "Assigned";
}

async function loadTask(
  projectId: number,
  taskIdentifier: EntityIdentifier
): Promise<TaskDetailRecord | null> {
  const supportsTaskUuid = prismaModelHasField("Task", "uuid");
  if (taskIdentifier.kind === "uuid" && !supportsTaskUuid) {
    return null;
  }

  const task = await prisma.task.findFirst({
    where:
      taskIdentifier.kind === "uuid"
        ? { uuid: taskIdentifier.uuid, projectId }
        : { id: taskIdentifier.id, projectId },
    include: {
      assignee: true,
    },
  });

  if (!task) {
    return null;
  }

  return {
    id: getRouteId(task),
    title: task.title,
    description: task.description,
    assigneeId: task.assignee ? getRouteId(task.assignee) : null,
    assigneeEmail: task.assignee?.email ?? null,
    assigneeFirstName: task.assignee?.firstName ?? null,
    assigneeLastName: task.assignee?.lastName ?? null,
    dueDate: task.dueDate,
    priority: task.priority,
    status: task.status,
    projectId: task.projectId !== null ? String(task.projectId) : null,
    createdAt: task.createdAt,
    createdByEmail: task.createdByEmail,
  };
}

interface ProjectTaskDetailPageProps {
  params: Promise<{
    id: string;
    taskId: string;
  }>;
}

export default async function ProjectTaskDetailPage({ params }: ProjectTaskDetailPageProps) {
  const resolvedParams = await params;
  const projectIdentifier = parseEntityIdentifier(resolvedParams.id);
  const taskIdentifier = parseEntityIdentifier(resolvedParams.taskId);

  if (!projectIdentifier || !taskIdentifier) {
    notFound();
  }

  const supportsProjectUuid = prismaModelHasField("Project", "uuid");
  if (projectIdentifier.kind === "uuid" && !supportsProjectUuid) {
    notFound();
  }

  const project = await prisma.project.findUnique({
    where:
      projectIdentifier.kind === "uuid"
        ? { uuid: projectIdentifier.uuid }
        : { id: projectIdentifier.id },
  });
  if (!project) {
    notFound();
  }

  const task = await loadTask(project.id, taskIdentifier);
  if (!task) {
    notFound();
  }

  const projectPath = `/projects/${encodeURIComponent(getRouteId(project))}/tasks`;

  return (
    <section className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">Task details</p>
          <h2 className="mt-1 text-lg font-semibold">{task.title}</h2>
        </div>
        <Link
          href={projectPath}
          className="rounded-md border px-3 py-1.5 text-sm text-foreground transition hover:bg-muted"
        >
          Back to tasks
        </Link>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Badge variant="outline">{formatStatus(task.status)}</Badge>
        <Badge variant="outline">{formatPriority(task.priority)}</Badge>
      </div>

      <div className="mt-4 grid gap-4 text-sm md:grid-cols-2">
        <div className="rounded-lg border bg-muted/15 p-3">
          <p className="text-muted-foreground">Assignee</p>
          <p className="mt-1 font-medium text-foreground">{formatAssignee(task)}</p>
        </div>
        <div className="rounded-lg border bg-muted/15 p-3">
          <p className="text-muted-foreground">Due date</p>
          <p className="mt-1 font-medium text-foreground">{formatDate(task.dueDate)}</p>
        </div>
        <div className="rounded-lg border bg-muted/15 p-3">
          <p className="text-muted-foreground">Created by</p>
          <p className="mt-1 font-medium text-foreground">{task.createdByEmail}</p>
        </div>
        <div className="rounded-lg border bg-muted/15 p-3">
          <p className="text-muted-foreground">Created at</p>
          <p className="mt-1 font-medium text-foreground">{formatDate(task.createdAt)}</p>
        </div>
      </div>

      <div className="mt-4 rounded-lg border bg-muted/10 p-3 text-sm">
        <p className="text-muted-foreground">Description</p>
        <p className="mt-1 whitespace-pre-wrap text-foreground">
          {task.description || "No description provided."}
        </p>
      </div>
    </section>
  );
}
