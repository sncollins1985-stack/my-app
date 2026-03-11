import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";

type TaskPriorityValue = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
type TaskStatusValue = "NOT_STARTED" | "IN_PROGRESS" | "BLOCKED" | "DONE";

type TaskDetailRecord = {
  id: number;
  title: string;
  description: string | null;
  assigneeId: number | null;
  assigneeEmail: string | null;
  assigneeFirstName: string | null;
  assigneeLastName: string | null;
  dueDate: Date | string | null;
  priority: TaskPriorityValue;
  status: TaskStatusValue;
  projectId: number | null;
  createdAt: Date | string;
  createdByEmail: string;
};

type TaskDelegateLike = {
  findFirst: (args: {
    where: { id: number; projectId: number };
    include: {
      assignee: {
        select: { id: true; email: true; firstName: true; lastName: true };
      };
    };
  }) => Promise<
    | {
        id: number;
        title: string;
        description: string | null;
        assigneeId: number | null;
        dueDate: Date | null;
        priority: TaskPriorityValue;
        status: TaskStatusValue;
        projectId: number | null;
        createdAt: Date;
        createdByEmail: string;
        assignee: {
          id: number;
          email: string;
          firstName: string | null;
          lastName: string | null;
        } | null;
      }
    | null
  >;
};

function getTaskDelegate() {
  const client = prisma as unknown as { task?: TaskDelegateLike };
  return client.task ?? null;
}

function formatDate(value: Date | string | null) {
  if (!value) {
    return "Not set";
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString("en-GB", {
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

async function loadTask(projectId: number, taskId: number): Promise<TaskDetailRecord | null> {
  const taskDelegate = getTaskDelegate();
  if (taskDelegate) {
    const task = await taskDelegate.findFirst({
      where: { id: taskId, projectId },
      include: {
        assignee: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });

    if (!task) {
      return null;
    }

    return {
      id: task.id,
      title: task.title,
      description: task.description,
      assigneeId: task.assigneeId,
      assigneeEmail: task.assignee?.email ?? null,
      assigneeFirstName: task.assignee?.firstName ?? null,
      assigneeLastName: task.assignee?.lastName ?? null,
      dueDate: task.dueDate,
      priority: task.priority,
      status: task.status,
      projectId: task.projectId,
      createdAt: task.createdAt,
      createdByEmail: task.createdByEmail,
    };
  }

  const rows = await prisma.$queryRaw<TaskDetailRecord[]>`
    SELECT
      t."id",
      t."title",
      t."description",
      t."assigneeId",
      u."email" AS "assigneeEmail",
      u."firstName" AS "assigneeFirstName",
      u."lastName" AS "assigneeLastName",
      t."dueDate",
      t."priority",
      t."status",
      t."projectId",
      t."createdAt",
      t."createdByEmail"
    FROM "Task" t
    LEFT JOIN "User" u ON u."id" = t."assigneeId"
    WHERE t."id" = ${taskId} AND t."projectId" = ${projectId}
    LIMIT 1
  `;

  return rows[0] ?? null;
}

interface ProjectTaskDetailPageProps {
  params: Promise<{
    id: string;
    taskId: string;
  }>;
}

export default async function ProjectTaskDetailPage({ params }: ProjectTaskDetailPageProps) {
  const resolvedParams = await params;
  const projectId = Number(resolvedParams.id);
  const taskId = Number(resolvedParams.taskId);

  if (!Number.isInteger(projectId) || projectId <= 0) {
    notFound();
  }

  if (!Number.isInteger(taskId) || taskId <= 0) {
    notFound();
  }

  const task = await loadTask(projectId, taskId);
  if (!task) {
    notFound();
  }

  const projectPath = `/projects/${encodeURIComponent(String(projectId))}/tasks`;

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
