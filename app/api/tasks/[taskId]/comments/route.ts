import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseEntityIdentifier } from "@/lib/entity-id";

type TaskCommentRow = {
  id: number;
  body: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  authorEmail: string;
  authorFirstName: string | null;
  authorLastName: string | null;
};

interface TaskCommentsRouteParams {
  params: Promise<{
    taskId: string;
  }>;
}

function serializeDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toISOString();
}

function formatAuthorName(row: TaskCommentRow) {
  const fullName = [row.authorFirstName ?? "", row.authorLastName ?? ""].join(" ").trim();
  return fullName || row.authorEmail;
}

function serializeComment(row: TaskCommentRow) {
  return {
    id: row.id,
    body: row.body,
    createdAt: serializeDate(row.createdAt),
    updatedAt: serializeDate(row.updatedAt),
    authorName: formatAuthorName(row),
  };
}

function isMissingTaskCommentTableError(error: unknown) {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
    return false;
  }

  if (error.code === "P2021") {
    return true;
  }

  if (error.code !== "P2010") {
    return false;
  }

  const details = `${String(error.meta?.message ?? "")} ${error.message}`
    .toLowerCase()
    .replace(/\s+/g, " ");

  if (!details.includes("taskcomment")) {
    return false;
  }

  return (
    details.includes("no such table") ||
    details.includes("does not exist") ||
    details.includes("invalid object name") ||
    (details.includes("table") && details.includes("not found"))
  );
}

// GET /api/tasks/:taskId/comments -> list task comments (AUTH REQUIRED)
export async function GET(_request: Request, { params }: TaskCommentsRouteParams) {
  try {
    const authUser = await getCurrentUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const taskIdentifier = parseEntityIdentifier(resolvedParams.taskId);
    if (!taskIdentifier) {
      return NextResponse.json(
        { error: "taskId must be a UUID or positive integer" },
        { status: 400 }
      );
    }

    const rows =
      taskIdentifier.kind === "uuid"
        ? await prisma.$queryRaw<TaskCommentRow[]>`
            SELECT
              tc."id",
              tc."body",
              tc."createdAt",
              tc."updatedAt",
              au."email" AS "authorEmail",
              u."firstName" AS "authorFirstName",
              u."lastName" AS "authorLastName"
            FROM "TaskComment" tc
            INNER JOIN "AuthUser" au ON au."id" = tc."authorUserId"
            LEFT JOIN "User" u ON u."email" = au."email"
            WHERE tc."taskUuid" = ${taskIdentifier.uuid}
            ORDER BY tc."createdAt" ASC, tc."id" ASC
          `
        : await prisma.$queryRaw<TaskCommentRow[]>`
            SELECT
              tc."id",
              tc."body",
              tc."createdAt",
              tc."updatedAt",
              au."email" AS "authorEmail",
              u."firstName" AS "authorFirstName",
              u."lastName" AS "authorLastName"
            FROM "TaskComment" tc
            INNER JOIN "AuthUser" au ON au."id" = tc."authorUserId"
            LEFT JOIN "User" u ON u."email" = au."email"
            WHERE tc."taskId" = ${taskIdentifier.id}
            ORDER BY tc."createdAt" ASC, tc."id" ASC
          `;

    return NextResponse.json(rows.map(serializeComment));
  } catch (error) {
    if (isMissingTaskCommentTableError(error)) {
      return NextResponse.json([]);
    }

    console.error("GET /api/tasks/:taskId/comments failed", error);
    return NextResponse.json({ error: "Failed to load task comments" }, { status: 500 });
  }
}

// POST /api/tasks/:taskId/comments -> create task comment (AUTH REQUIRED)
export async function POST(request: Request, { params }: TaskCommentsRouteParams) {
  try {
    const authUser = await getCurrentUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const taskIdentifier = parseEntityIdentifier(resolvedParams.taskId);
    if (!taskIdentifier) {
      return NextResponse.json(
        { error: "taskId must be a UUID or positive integer" },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const commentBody = typeof body.body === "string" ? body.body.trim() : "";
    if (!commentBody) {
      return NextResponse.json({ error: "body is required" }, { status: 400 });
    }

    const task = await prisma.task.findUnique({
      where:
        taskIdentifier.kind === "uuid"
          ? { uuid: taskIdentifier.uuid }
          : { id: taskIdentifier.id },
      select: { id: true, uuid: true },
    });
    if (!task) {
      return NextResponse.json({ error: "Task was not found" }, { status: 404 });
    }

    const createdComment = await prisma.$transaction(async (transaction) => {
      await transaction.$executeRaw`
        INSERT INTO "TaskComment" (
          "taskId",
          "taskUuid",
          "authorUserId",
          "authorUserUuid",
          "body"
        )
        VALUES (
          ${task.id},
          ${task.uuid},
          ${authUser.id},
          ${authUser.uuid},
          ${commentBody}
        )
      `;

      const rows = await transaction.$queryRaw<TaskCommentRow[]>`
        SELECT
          tc."id",
          tc."body",
          tc."createdAt",
          tc."updatedAt",
          au."email" AS "authorEmail",
          u."firstName" AS "authorFirstName",
          u."lastName" AS "authorLastName"
        FROM "TaskComment" tc
        INNER JOIN "AuthUser" au ON au."id" = tc."authorUserId"
        LEFT JOIN "User" u ON u."email" = au."email"
        WHERE tc."id" = last_insert_rowid()
        LIMIT 1
      `;

      if (!rows[0]) {
        throw new Error("Task comment insert failed");
      }

      return rows[0];
    });

    return NextResponse.json(serializeComment(createdComment), { status: 201 });
  } catch (error) {
    if (isMissingTaskCommentTableError(error)) {
      return NextResponse.json(
        { error: "Task comment table is missing. Apply the latest Prisma migration." },
        { status: 500 }
      );
    }

    console.error("POST /api/tasks/:taskId/comments failed", error);
    return NextResponse.json({ error: "Failed to create task comment" }, { status: 500 });
  }
}
