import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  buildTaskFieldChangeActivities,
  insertTaskActivitiesBestEffort,
} from "@/lib/task-activity";

type TaskPriorityValue = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
type TaskStatusValue = "NOT_STARTED" | "IN_PROGRESS" | "BLOCKED" | "DONE";

type TaskRecord = {
  id: number;
  title: string;
  description: string | null;
  assigneeId: number | null;
  dueDate: Date | string | null;
  priority: TaskPriorityValue;
  status: TaskStatusValue;
  projectId: number | null;
  createdAt: Date | string;
  createdByAuthUserId: number;
  createdByEmail: string;
};

type UserRecord = {
  id: number;
  firstName: string | null;
  lastName: string | null;
  email: string;
};

const PRIORITY_MAP: Record<string, TaskPriorityValue> = {
  low: "LOW",
  medium: "MEDIUM",
  high: "HIGH",
  critical: "CRITICAL",
};

const STATUS_MAP: Record<string, TaskStatusValue> = {
  not_started: "NOT_STARTED",
  in_progress: "IN_PROGRESS",
  blocked: "BLOCKED",
  done: "DONE",
};

type TaskDelegateLike = {
  findUnique: (args: { where: { id: number } }) => Promise<TaskRecord | null>;
  update: (args: {
    where: { id: number };
    data: {
      title: string;
      description: string | null;
      assigneeId: number | null;
      dueDate: Date | null;
      priority: TaskPriorityValue;
      status: TaskStatusValue;
      projectId: number | null;
    };
  }) => Promise<TaskRecord>;
};

function getTaskDelegate() {
  const client = prisma as unknown as { task?: TaskDelegateLike };
  return client.task ?? null;
}

function getTaskDelegateFromClient(client: unknown): TaskDelegateLike | null {
  const typed = client as { task?: TaskDelegateLike };
  return typed.task ?? null;
}

function parseRequiredPositiveInt(value: string) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return Number.NaN;
  }

  return parsed;
}

function parseOptionalPositiveInt(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numericValue =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN;

  if (!Number.isInteger(numericValue) || numericValue <= 0) {
    return Number.NaN;
  }

  return numericValue;
}

function parseDueDate(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    return "invalid" as const;
  }

  const normalizedValue = value.trim();
  if (!normalizedValue) {
    return null;
  }

  const slashMatch = normalizedValue.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const [, dayPart, monthPart, yearPart] = slashMatch;
    const day = Number(dayPart);
    const month = Number(monthPart);
    const year = Number(yearPart);
    const parsedFromSlash = new Date(Date.UTC(year, month - 1, day));

    if (
      parsedFromSlash.getUTCFullYear() === year &&
      parsedFromSlash.getUTCMonth() + 1 === month &&
      parsedFromSlash.getUTCDate() === day
    ) {
      return parsedFromSlash;
    }

    return "invalid" as const;
  }

  const parsedDate = new Date(normalizedValue);
  if (Number.isNaN(parsedDate.getTime())) {
    return "invalid" as const;
  }

  return parsedDate;
}

function normalizeStoredDate(value: Date | string | null) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function enumPriorityToInput(value: TaskPriorityValue) {
  switch (value) {
    case "LOW":
      return "low";
    case "HIGH":
      return "high";
    case "CRITICAL":
      return "critical";
    case "MEDIUM":
    default:
      return "medium";
  }
}

function enumStatusToInput(value: TaskStatusValue) {
  switch (value) {
    case "IN_PROGRESS":
      return "in_progress";
    case "BLOCKED":
      return "blocked";
    case "DONE":
      return "done";
    case "NOT_STARTED":
    default:
      return "not_started";
  }
}

function formatAssigneeLabel(user: Pick<UserRecord, "firstName" | "lastName" | "email">) {
  const fullName = [user.firstName ?? "", user.lastName ?? ""].join(" ").trim();
  if (fullName) {
    return user.email ? `${fullName} (${user.email})` : fullName;
  }

  return user.email?.trim() || "Assigned";
}

interface TaskRouteParams {
  params: Promise<{
    taskId: string;
  }>;
}

// PATCH /api/tasks/:taskId -> update task (AUTH REQUIRED)
export async function PATCH(request: Request, { params }: TaskRouteParams) {
  try {
    const authUser = await getCurrentUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const taskId = parseRequiredPositiveInt(resolvedParams.taskId);
    if (Number.isNaN(taskId)) {
      return NextResponse.json({ error: "taskId must be a positive integer" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const taskDelegate = getTaskDelegate();
    const existingTask = taskDelegate
      ? await taskDelegate.findUnique({
          where: { id: taskId },
        })
      : (
          await prisma.$queryRaw<TaskRecord[]>`
            SELECT *
            FROM "Task"
            WHERE "id" = ${taskId}
            LIMIT 1
          `
        )[0] ?? null;

    if (!existingTask) {
      return NextResponse.json({ error: "Task was not found" }, { status: 404 });
    }

    const title =
      typeof body.title === "string" ? body.title.trim() : existingTask.title.trim() ?? "";
    if (!title) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }

    let description = existingTask.description;
    if (body.description === null) {
      description = null;
    } else if (typeof body.description === "string") {
      const normalizedDescription = body.description.trim();
      description = normalizedDescription.length > 0 ? normalizedDescription : null;
    }

    const assigneeId =
      body.assigneeId === undefined ? existingTask.assigneeId : parseOptionalPositiveInt(body.assigneeId);
    if (Number.isNaN(assigneeId)) {
      return NextResponse.json(
        { error: "assigneeId must be a positive integer" },
        { status: 400 }
      );
    }

    const requestedProjectId =
      body.projectId === undefined ? existingTask.projectId : parseOptionalPositiveInt(body.projectId);
    if (Number.isNaN(requestedProjectId)) {
      return NextResponse.json(
        { error: "projectId must be a positive integer" },
        { status: 400 }
      );
    }

    if (body.projectId !== undefined && requestedProjectId !== existingTask.projectId) {
      return NextResponse.json(
        { error: "projectId does not match this task" },
        { status: 400 }
      );
    }

    const dueDate = Object.prototype.hasOwnProperty.call(body, "dueDate")
      ? parseDueDate(body.dueDate)
      : normalizeStoredDate(existingTask.dueDate);
    if (dueDate === "invalid") {
      return NextResponse.json({ error: "dueDate must be a valid date" }, { status: 400 });
    }

    const priorityInput =
      typeof body.priority === "string"
        ? body.priority.trim().toLowerCase()
        : enumPriorityToInput(existingTask.priority);
    const statusInput =
      typeof body.status === "string"
        ? body.status.trim().toLowerCase()
        : enumStatusToInput(existingTask.status);
    const priority = PRIORITY_MAP[priorityInput];
    const status = STATUS_MAP[statusInput];

    if (!priority) {
      return NextResponse.json(
        { error: "priority must be low, medium, high, or critical" },
        { status: 400 }
      );
    }

    if (!status) {
      return NextResponse.json(
        { error: "status must be not_started, in_progress, blocked, or done" },
        { status: 400 }
      );
    }

    if (assigneeId !== null) {
      const assignee = await prisma.user.findUnique({
        where: { id: assigneeId },
        select: { id: true },
      });

      if (!assignee) {
        return NextResponse.json({ error: "assignee was not found" }, { status: 400 });
      }
    }

    if (requestedProjectId !== null) {
      const project = await prisma.project.findUnique({
        where: { id: requestedProjectId },
        select: { id: true },
      });

      if (!project) {
        return NextResponse.json({ error: "project was not found" }, { status: 400 });
      }
    }

    const assigneeIdsToLookup = Array.from(
      new Set([existingTask.assigneeId, assigneeId].filter((value): value is number => value !== null))
    );
    const assigneeRows = assigneeIdsToLookup.length
      ? await prisma.user.findMany({
          where: { id: { in: assigneeIdsToLookup } },
          select: { id: true, firstName: true, lastName: true, email: true },
        })
      : [];
    const assigneeLabelById = new Map(
      assigneeRows.map((row) => [row.id, formatAssigneeLabel(row)])
    );

    const previousAssigneeLabel =
      existingTask.assigneeId === null
        ? "Unassigned"
        : assigneeLabelById.get(existingTask.assigneeId) ?? "Assigned";
    const nextAssigneeLabel =
      assigneeId === null ? "Unassigned" : assigneeLabelById.get(assigneeId) ?? "Assigned";

    const updatedTask = await prisma.$transaction(async (transaction) => {
      const transactionTaskDelegate = getTaskDelegateFromClient(transaction as unknown);
      const result = transactionTaskDelegate
        ? await transactionTaskDelegate.update({
            where: { id: taskId },
            data: {
              title,
              description,
              assigneeId,
              dueDate,
              priority,
              status,
              projectId: requestedProjectId,
            },
          })
        : await (async () => {
            await transaction.$executeRaw`
              UPDATE "Task"
              SET
                "title" = ${title},
                "description" = ${description},
                "assigneeId" = ${assigneeId},
                "dueDate" = ${dueDate ? dueDate.toISOString() : null},
                "priority" = ${priority},
                "status" = ${status},
                "projectId" = ${requestedProjectId}
              WHERE "id" = ${taskId}
            `;

            const rows = await transaction.$queryRaw<TaskRecord[]>`
              SELECT *
              FROM "Task"
              WHERE "id" = ${taskId}
              LIMIT 1
            `;

            if (!rows[0]) {
              throw new Error("Task update failed");
            }

            return rows[0];
          })();

      const activityEntries = buildTaskFieldChangeActivities({
        taskId,
        userId: authUser.id,
        previous: {
          title: existingTask.title,
          description: existingTask.description,
          assigneeId: existingTask.assigneeId,
          dueDate: existingTask.dueDate,
          priority: existingTask.priority,
          status: existingTask.status,
        },
        next: {
          title: result.title,
          description: result.description,
          assigneeId: result.assigneeId,
          dueDate: result.dueDate,
          priority: result.priority,
          status: result.status,
        },
        previousAssigneeLabel,
        nextAssigneeLabel,
      });

      if (activityEntries.length > 0) {
        await insertTaskActivitiesBestEffort(transaction, activityEntries);
      }

      return result;
    });

    return NextResponse.json(updatedTask);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2021") {
      return NextResponse.json(
        { error: "Task tables are missing. Apply the latest Prisma migration." },
        { status: 500 }
      );
    }

    console.error("PATCH /api/tasks/:taskId failed", error);
    return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
  }
}
