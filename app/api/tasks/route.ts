import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { insertTaskActivitiesBestEffort } from "@/lib/task-activity";

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
  findMany: (args: {
    where: { projectId?: number };
    orderBy: { createdAt: "desc" };
  }) => Promise<TaskRecord[]>;
  create: (args: {
    data: {
      title: string;
      description: string | null;
      assigneeId: number | null;
      dueDate: Date | null;
      priority: TaskPriorityValue;
      status: TaskStatusValue;
      projectId: number | null;
      createdByAuthUserId: number;
      createdByEmail: string;
    };
  }) => Promise<TaskRecord>;
};

function getTaskDelegateFromClient(client: unknown): TaskDelegateLike | null {
  const typedClient = client as { task?: TaskDelegateLike };
  return typedClient.task ?? null;
}

function getTaskDelegate(): TaskDelegateLike | null {
  const client = prisma as unknown;
  return getTaskDelegateFromClient(client);
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

// GET /api/tasks -> list tasks (AUTH REQUIRED)
export async function GET(request: Request) {
  try {
    const authUser = await getCurrentUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const projectId = parseOptionalPositiveInt(url.searchParams.get("projectId"));

    if (Number.isNaN(projectId)) {
      return NextResponse.json(
        { error: "projectId must be a positive integer" },
        { status: 400 }
      );
    }

    const taskDelegate = getTaskDelegate();
    const tasks = taskDelegate
      ? await taskDelegate.findMany({
          where: {
            projectId: projectId ?? undefined,
          },
          orderBy: { createdAt: "desc" },
        })
      : projectId !== null
        ? await prisma.$queryRaw<TaskRecord[]>`
            SELECT *
            FROM "Task"
            WHERE "projectId" = ${projectId}
            ORDER BY "createdAt" DESC
          `
        : await prisma.$queryRaw<TaskRecord[]>`
            SELECT *
            FROM "Task"
            ORDER BY "createdAt" DESC
          `;

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

    const assigneeId = parseOptionalPositiveInt(body.assigneeId);
    if (Number.isNaN(assigneeId)) {
      return NextResponse.json(
        { error: "assigneeId must be a positive integer" },
        { status: 400 }
      );
    }

    const projectId = parseOptionalPositiveInt(body.projectId);
    if (Number.isNaN(projectId)) {
      return NextResponse.json(
        { error: "projectId must be a positive integer" },
        { status: 400 }
      );
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

    if (assigneeId !== null) {
      const assignee = await prisma.user.findUnique({
        where: { id: assigneeId },
        select: { id: true },
      });

      if (!assignee) {
        return NextResponse.json({ error: "assignee was not found" }, { status: 400 });
      }
    }

    if (projectId !== null) {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { id: true },
      });

      if (!project) {
        return NextResponse.json({ error: "project was not found" }, { status: 400 });
      }
    }

    const task = await prisma.$transaction(async (transaction) => {
      const transactionTaskDelegate = getTaskDelegateFromClient(transaction as unknown);
      const createdTask = transactionTaskDelegate
        ? await transactionTaskDelegate.create({
            data: {
              title,
              description,
              assigneeId,
              dueDate: dueDate ?? null,
              priority,
              status,
              projectId,
              createdByAuthUserId: authUser.id,
              createdByEmail: authUser.email,
            },
          })
        : await (async () => {
            await transaction.$executeRaw`
              INSERT INTO "Task" (
                "title",
                "description",
                "assigneeId",
                "dueDate",
                "priority",
                "status",
                "projectId",
                "createdByAuthUserId",
                "createdByEmail"
              )
              VALUES (
                ${title},
                ${description},
                ${assigneeId},
                ${dueDate ? dueDate.toISOString() : null},
                ${priority},
                ${status},
                ${projectId},
                ${authUser.id},
                ${authUser.email}
              )
            `;

            const rows = await transaction.$queryRaw<TaskRecord[]>`
              SELECT *
              FROM "Task"
              WHERE "id" = last_insert_rowid()
            `;

            if (!rows[0]) {
              throw new Error("Task insert failed");
            }

            return rows[0];
          })();

      await insertTaskActivitiesBestEffort(transaction, [
        {
          taskId: createdTask.id,
          userId: authUser.id,
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
