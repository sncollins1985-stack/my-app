import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseOptionalEntityIdentifier } from "@/lib/entity-id";
import { insertTaskActivitiesBestEffort } from "@/lib/task-activity";

type TaskPriorityValue = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
type TaskStatusValue = "NOT_STARTED" | "IN_PROGRESS" | "BLOCKED" | "DONE";

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

  // Support fallback text date entry in environments where date inputs degrade to text.
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

function identifierError(fieldName: string) {
  return `${fieldName} must be a UUID or positive integer`;
}

// GET /api/tasks -> list tasks (AUTH REQUIRED)
export async function GET(request: Request) {
  try {
    const authUser = await getCurrentUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const projectIdentifier = parseOptionalEntityIdentifier(url.searchParams.get("projectId"));
    if (projectIdentifier === "invalid") {
      return NextResponse.json({ error: identifierError("projectId") }, { status: 400 });
    }

    const tasks = await prisma.task.findMany({
      where:
        projectIdentifier === null
          ? undefined
          : projectIdentifier.kind === "uuid"
            ? { projectUuid: projectIdentifier.uuid }
            : { projectId: projectIdentifier.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(tasks);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2021") {
      return NextResponse.json(
        { error: "Task tables are missing. Apply the latest Prisma migration." },
        { status: 500 }
      );
    }

    console.error("GET /api/tasks failed", error);
    return NextResponse.json({ error: "Failed to load tasks" }, { status: 500 });
  }
}

// POST /api/tasks -> create task (AUTH REQUIRED)
export async function POST(request: Request) {
  try {
    const authUser = await getCurrentUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const descriptionValue = typeof body.description === "string" ? body.description.trim() : "";
    const description = descriptionValue.length > 0 ? descriptionValue : null;

    if (!title) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }

    const assigneeIdentifier = parseOptionalEntityIdentifier(body.assigneeId);
    if (assigneeIdentifier === "invalid") {
      return NextResponse.json({ error: identifierError("assigneeId") }, { status: 400 });
    }

    const projectIdentifier = parseOptionalEntityIdentifier(body.projectId);
    if (projectIdentifier === "invalid") {
      return NextResponse.json({ error: identifierError("projectId") }, { status: 400 });
    }

    const dueDate = parseDueDate(body.dueDate);
    if (dueDate === "invalid") {
      return NextResponse.json({ error: "dueDate must be a valid date" }, { status: 400 });
    }

    const priorityInput =
      typeof body.priority === "string" ? body.priority.trim().toLowerCase() : "medium";
    const statusInput =
      typeof body.status === "string" ? body.status.trim().toLowerCase() : "not_started";
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

    const assignee =
      assigneeIdentifier === null
        ? null
        : await prisma.user.findUnique({
            where:
              assigneeIdentifier.kind === "uuid"
                ? { uuid: assigneeIdentifier.uuid }
                : { id: assigneeIdentifier.id },
            select: { id: true, uuid: true },
          });
    if (assigneeIdentifier !== null && !assignee) {
      return NextResponse.json({ error: "assignee was not found" }, { status: 400 });
    }

    const project =
      projectIdentifier === null
        ? null
        : await prisma.project.findUnique({
            where:
              projectIdentifier.kind === "uuid"
                ? { uuid: projectIdentifier.uuid }
                : { id: projectIdentifier.id },
            select: { id: true, uuid: true },
          });
    if (projectIdentifier !== null && !project) {
      return NextResponse.json({ error: "project was not found" }, { status: 400 });
    }

    const task = await prisma.$transaction(async (transaction) => {
      const createdTask = await transaction.task.create({
        data: {
          title,
          description,
          assigneeId: assignee?.id ?? null,
          assigneeUuid: assignee?.uuid ?? null,
          dueDate: dueDate ?? null,
          priority,
          status,
          projectId: project?.id ?? null,
          projectUuid: project?.uuid ?? null,
          createdByAuthUserId: authUser.id,
          createdByAuthUserUuid: authUser.uuid,
          createdByEmail: authUser.email,
        },
      });

      await insertTaskActivitiesBestEffort(transaction, [
        {
          taskId: createdTask.id,
          taskUuid: createdTask.uuid,
          userId: authUser.id,
          userUuid: authUser.uuid,
          actionType: "CREATED",
          field: null,
          oldValue: null,
          newValue: null,
        },
      ]);

      return createdTask;
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2021") {
      return NextResponse.json(
        { error: "Task table is missing. Apply the latest Prisma migration." },
        { status: 500 }
      );
    }

    console.error("POST /api/tasks failed", error);
    return NextResponse.json({ error: "Failed to create task record" }, { status: 500 });
  }
}
