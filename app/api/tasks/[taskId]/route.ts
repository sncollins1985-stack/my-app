import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  buildTaskFieldChangeActivities,
  insertTaskActivitiesBestEffort,
} from "@/lib/task-activity";
import {
  EntityIdentifier,
  matchesEntityIdentifier,
  parseEntityIdentifier,
  parseOptionalEntityIdentifier,
} from "@/lib/entity-id";

type TaskPriorityValue = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
type TaskStatusValue = "NOT_STARTED" | "IN_PROGRESS" | "BLOCKED" | "DONE";

type TaskRecord = {
  id: number;
  uuid: string;
  title: string;
  description: string | null;
  assigneeId: number | null;
  assigneeUuid: string | null;
  dueDate: Date | string | null;
  priority: TaskPriorityValue;
  status: TaskStatusValue;
  projectId: number | null;
  projectUuid: string | null;
  createdAt: Date | string;
  createdByAuthUserId: number;
  createdByAuthUserUuid: string;
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

function identifierError(fieldName: string) {
  return `${fieldName} must be a UUID or positive integer`;
}

function doesTaskProjectMatchIdentifier(
  identifier: EntityIdentifier | null,
  task: Pick<TaskRecord, "projectId" | "projectUuid">
) {
  if (identifier === null) {
    return task.projectId === null && task.projectUuid === null;
  }

  return matchesEntityIdentifier(identifier, {
    id: task.projectId,
    uuid: task.projectUuid,
  });
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
    const taskIdentifier = parseEntityIdentifier(resolvedParams.taskId);
    if (!taskIdentifier) {
      return NextResponse.json({ error: identifierError("taskId") }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const existingTask = await prisma.task.findUnique({
      where:
        taskIdentifier.kind === "uuid"
          ? { uuid: taskIdentifier.uuid }
          : { id: taskIdentifier.id },
    });

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

    let assignee = {
      id: existingTask.assigneeId,
      uuid: existingTask.assigneeUuid,
    };
    if (body.assigneeId !== undefined) {
      const assigneeIdentifier = parseOptionalEntityIdentifier(body.assigneeId);
      if (assigneeIdentifier === "invalid") {
        return NextResponse.json({ error: identifierError("assigneeId") }, { status: 400 });
      }

      if (assigneeIdentifier === null) {
        assignee = { id: null, uuid: null };
      } else {
        const resolvedAssignee = await prisma.user.findUnique({
          where:
            assigneeIdentifier.kind === "uuid"
              ? { uuid: assigneeIdentifier.uuid }
              : { id: assigneeIdentifier.id },
          select: { id: true, uuid: true },
        });

        if (!resolvedAssignee) {
          return NextResponse.json({ error: "assignee was not found" }, { status: 400 });
        }

        assignee = { id: resolvedAssignee.id, uuid: resolvedAssignee.uuid };
      }
    }

    let requestedProject = {
      id: existingTask.projectId,
      uuid: existingTask.projectUuid,
    };
    if (body.projectId !== undefined) {
      const projectIdentifier = parseOptionalEntityIdentifier(body.projectId);
      if (projectIdentifier === "invalid") {
        return NextResponse.json({ error: identifierError("projectId") }, { status: 400 });
      }

      if (!doesTaskProjectMatchIdentifier(projectIdentifier, existingTask)) {
        return NextResponse.json(
          { error: "projectId does not match this task" },
          { status: 400 }
        );
      }

      if (projectIdentifier === null) {
        requestedProject = { id: null, uuid: null };
      } else {
        const resolvedProject = await prisma.project.findUnique({
          where:
            projectIdentifier.kind === "uuid"
              ? { uuid: projectIdentifier.uuid }
              : { id: projectIdentifier.id },
          select: { id: true, uuid: true },
        });

        if (!resolvedProject) {
          return NextResponse.json({ error: "project was not found" }, { status: 400 });
        }

        requestedProject = { id: resolvedProject.id, uuid: resolvedProject.uuid };
      }
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

    const assigneeIdsToLookup = Array.from(
      new Set(
        [existingTask.assigneeId, assignee.id].filter((value): value is number => value !== null)
      )
    );
    const assigneeRows = assigneeIdsToLookup.length
      ? await prisma.user.findMany({
          where: { id: { in: assigneeIdsToLookup } },
          select: { id: true, firstName: true, lastName: true, email: true },
        })
      : [];
    const assigneeLabelById = new Map(assigneeRows.map((row) => [row.id, formatAssigneeLabel(row)]));

    const previousAssigneeLabel =
      existingTask.assigneeId === null
        ? "Unassigned"
        : assigneeLabelById.get(existingTask.assigneeId) ?? "Assigned";
    const nextAssigneeLabel =
      assignee.id === null ? "Unassigned" : assigneeLabelById.get(assignee.id) ?? "Assigned";

    const updatedTask = await prisma.$transaction(async (transaction) => {
      const result = await transaction.task.update({
        where: { id: existingTask.id },
        data: {
          title,
          description,
          assigneeId: assignee.id,
          assigneeUuid: assignee.uuid,
          dueDate,
          priority,
          status,
          projectId: requestedProject.id,
          projectUuid: requestedProject.uuid,
        },
      });

      const activityEntries = buildTaskFieldChangeActivities({
        taskId: result.id,
        taskUuid: result.uuid,
        userId: authUser.id,
        userUuid: authUser.uuid,
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
