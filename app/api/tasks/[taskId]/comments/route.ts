import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

function parseRequiredPositiveInt(value: string) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return Number.NaN;
  }

  return parsed;
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
    details.includes("table") && details.includes("not found")
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
    const taskId = parseRequiredPositiveInt(resolvedParams.taskId);
    if (Number.isNaN(taskId)) {
      return NextResponse.json({ error: "taskId must be a positive integer" }, { status: 400 });
    }

    const rows = await prisma.$queryRaw<TaskCommentRow[]>`
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
      WHERE tc."taskId" = ${taskId}
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
    const taskId = parseRequiredPositiveInt(resolvedParams.taskId);
    if (Number.isNaN(taskId)) {
      return NextResponse.json({ error: "taskId must be a positive integer" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const commentBody = typeof body.body === "string" ? body.body.trim() : "";
    if (!commentBody) {
      return NextResponse.json({ error: "body is required" }, { status: 400 });
    }

    const createdComment = await prisma.$transaction(async (transaction) => {
      const taskRows = await transaction.$queryRaw<{ id: number }[]>`
        SELECT "id"
        FROM "Task"
        WHERE "id" = ${taskId}
        LIMIT 1
      `;
      if (!taskRows[0]) {
        return { missingTask: true as const, comment: null };
      }

      await transaction.$executeRaw`
        INSERT INTO "TaskComment" (
          "taskId",
          "authorUserId",
          "body"
        )
        VALUES (
          ${taskId},
          ${authUser.id},
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

      return { missingTask: false as const, comment: rows[0] };
    });

    if (createdComment.missingTask || !createdComment.comment) {
      return NextResponse.json({ error: "Task was not found" }, { status: 404 });
    }

    return NextResponse.json(serializeComment(createdComment.comment), { status: 201 });
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
