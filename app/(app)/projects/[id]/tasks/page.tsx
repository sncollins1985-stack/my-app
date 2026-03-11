import { notFound } from "next/navigation";
import { prisma, prismaModelHasField } from "@/lib/prisma";
import { ProjectTasksGrid } from "@/components/project-tasks-grid";
import { parseEntityIdentifier } from "@/lib/entity-id";
import { getRouteId } from "@/lib/route-id";

type TaskPriorityValue = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
type TaskStatusValue = "NOT_STARTED" | "IN_PROGRESS" | "BLOCKED" | "DONE";

type TaskGridRow = {
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
  createdAt: Date;
};

function serializeDate(value: Date | null) {
  if (!value) {
    return null;
  }

  if (Number.isNaN(value.getTime())) {
    return String(value);
  }

  return value.toISOString();
}

async function loadProjectTasks(projectId: number): Promise<TaskGridRow[]> {
  const tasks = await prisma.task.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    include: {
      assignee: true,
    },
  });

  return tasks.map((task) => ({
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
    createdAt: task.createdAt,
  }));
}

interface ProjectTasksPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ProjectTasksPage({ params }: ProjectTasksPageProps) {
  const resolvedParams = await params;
  const projectIdentifier = parseEntityIdentifier(resolvedParams.id);
  if (!projectIdentifier) {
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

  const tasks = await loadProjectTasks(project.id);
  const projectRouteId = getRouteId(project);

  return (
    <ProjectTasksGrid
      projectId={projectRouteId}
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
