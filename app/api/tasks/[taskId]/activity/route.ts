import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type TaskActivityActionType = "CREATED" | "FIELD_CHANGED";
type TaskActivityField =
  | "TITLE"
  | "DESCRIPTION"
  | "ASSIGNEE"
  | "DUE_DATE"
  | "PRIORITY"
  | "STATUS";

type TaskActivityRow = {
  id: number;
  actionType: TaskActivityActionType;
  field: TaskActivityField | null;
  oldValue: string | null;
  newValue: string | null;
  createdAt: Date | string;
  userEmail: string;
  userFirstName: string | null;
  userLastName: string | null;
};

interface TaskActivityRouteParams {
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

function formatActorName(row: TaskActivityRow) {
  const fullName = [row.userFirstName ?? "", row.userLastName ?? ""].join(" ").trim();
  return fullName || row.userEmail;
}

function isMissingTaskActivityTableError(error: unknown) {
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

  if (!details.includes("taskactivity")) {
    return false;
  }

  return (
    details.includes("no such table") ||
    details.includes("does not exist") ||
    details.includes("invalid object name") ||
    details.includes("table") && details.includes("not found")
  );
}

// GET /api/tasks/:taskId/activity -> list task activity (AUTH REQUIRED)
export async function GET(_request: Request, { params }: TaskActivityRouteParams) {
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

    const rows = await prisma.$queryRaw<TaskActivityRow[]>`
      SELECT
        ta."id",
        ta."actionType",
        ta."field",
        ta."oldValue",
        ta."newValue",
        ta."createdAt",
        au."email" AS "userEmail",
        u."firstName" AS "userFirstName",
        u."lastName" AS "userLastName"
      FROM "TaskActivity" ta
      INNER JOIN "AuthUser" au ON au."id" = ta."userId"
      LEFT JOIN "User" u ON u."email" = au."email"
      WHERE ta."taskId" = ${taskId}
      ORDER BY ta."createdAt" DESC, ta."id" DESC
    `;

    return NextResponse.json(
      rows.map((row) => ({
        id: row.id,
        actionType: row.actionType,
        field: row.field,
        oldValue: row.oldValue,
        newValue: row.newValue,
        createdAt: serializeDate(row.createdAt),
        userName: formatActorName(row),
      }))
    );
  } catch (error) {
    if (isMissingTaskActivityTableError(error)) {
      return NextResponse.json([]);
    }

    console.error("GET /api/tasks/:taskId/activity failed", error);
    return NextResponse.json({ error: "Failed to load task activity" }, { status: 500 });
  }
}
