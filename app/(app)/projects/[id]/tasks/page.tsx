import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ProjectTasksGrid } from "@/components/project-tasks-grid";

type TaskPriorityValue = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
type TaskStatusValue = "NOT_STARTED" | "IN_PROGRESS" | "BLOCKED" | "DONE";

type TaskGridRow = {
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
  createdAt: Date | string;
};

type TaskDelegateLike = {
  findMany: (args: {
    where: { projectId: number };
    orderBy: { createdAt: "desc" };
    include: {
      assignee: {
        select: { id: true; email: true; firstName: true; lastName: true };
      };
    };
  }) => Promise<
    Array<{
      id: number;
      title: string;
      description: string | null;
      assigneeId: number | null;
      dueDate: Date | null;
      priority: TaskPriorityValue;
      status: TaskStatusValue;
      createdAt: Date;
      assignee: {
        id: number;
        email: string;
        firstName: string | null;
        lastName: string | null;
      } | null;
    }>
  >;
};

function getTaskDelegate() {
  const client = prisma as unknown as { task?: TaskDelegateLike };
  return client.task ?? null;
}

function serializeDate(value: Date | string | null) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toISOString();
}

async function loadProjectTasks(projectId: number): Promise<TaskGridRow[]> {
  const taskDelegate = getTaskDelegate();
  if (taskDelegate) {
    const tasks = await taskDelegate.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      include: {
        assignee: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });

    return tasks.map((task) => ({
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
      createdAt: task.createdAt,
    }));
  }

  return prisma.$queryRaw<TaskGridRow[]>`
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
      t."createdAt"
    FROM "Task" t
    LEFT JOIN "User" u ON u."id" = t."assigneeId"
    WHERE t."projectId" = ${projectId}
    ORDER BY t."createdAt" DESC
  `;
}

interface ProjectTasksPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ProjectTasksPage({ params }: ProjectTasksPageProps) {
  const resolvedParams = await params;
  const projectId = Number(resolvedParams.id);

  if (!Number.isInteger(projectId) || projectId <= 0) {
    notFound();
  }

  const tasks = await loadProjectTasks(projectId);

  return (
    <ProjectTasksGrid
      projectId={String(projectId)}
      tasks={tasks.map((task) => ({
        id: task.id,
        title: task.title,
        description: task.description,
        assigneeId: task.assigneeId,
        assigneeEmail: task.assigneeEmail,
        assigneeFirstName: task.assigneeFirstName,
        assigneeLastName: task.assigneeLastName,
        dueDate: serializeDate(task.dueDate),
        priority: task.priority,
        status: task.status,
        createdAt: serializeDate(task.createdAt) ?? new Date().toISOString(),
      }))}
    />
  );
}
