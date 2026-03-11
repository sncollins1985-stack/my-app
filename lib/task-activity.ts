type TaskPriorityValue = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
type TaskStatusValue = "NOT_STARTED" | "IN_PROGRESS" | "BLOCKED" | "DONE";

export type TaskActivityActionType = "CREATED" | "FIELD_CHANGED";
export type TaskActivityField =
  | "TITLE"
  | "DESCRIPTION"
  | "ASSIGNEE"
  | "DUE_DATE"
  | "PRIORITY"
  | "STATUS";

export type TaskActivityInsert = {
  taskId: number;
  taskUuid: string;
  userId: number;
  userUuid: string;
  actionType: TaskActivityActionType;
  field: TaskActivityField | null;
  oldValue: string | null;
  newValue: string | null;
};

export type TaskActivitySource = {
  title: string;
  description: string | null;
  assigneeId: number | null;
  dueDate: Date | string | null;
  priority: TaskPriorityValue;
  status: TaskStatusValue;
};

type RawExecutor = {
  $executeRaw: (strings: TemplateStringsArray, ...values: unknown[]) => Promise<unknown>;
};

function formatPriority(priority: TaskPriorityValue) {
  switch (priority) {
    case "LOW":
      return "Low";
    case "HIGH":
      return "High";
    case "CRITICAL":
      return "Critical";
    case "MEDIUM":
    default:
      return "Medium";
  }
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

function normalizeDescription(value: string | null) {
  const normalized = value?.trim() ?? "";
  return normalized.length > 0 ? normalized : "(empty)";
}

function normalizeDueDate(value: Date | string | null) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toISOString().slice(0, 10);
}

export function buildTaskFieldChangeActivities(params: {
  taskId: number;
  taskUuid: string;
  userId: number;
  userUuid: string;
  previous: TaskActivitySource;
  next: TaskActivitySource;
  previousAssigneeLabel: string;
  nextAssigneeLabel: string;
}) {
  const { taskId, taskUuid, userId, userUuid, previous, next, previousAssigneeLabel, nextAssigneeLabel } =
    params;
  const entries: TaskActivityInsert[] = [];

  if (previous.title !== next.title) {
    entries.push({
      taskId,
      taskUuid,
      userId,
      userUuid,
      actionType: "FIELD_CHANGED",
      field: "TITLE",
      oldValue: previous.title,
      newValue: next.title,
    });
  }

  if ((previous.description ?? "") !== (next.description ?? "")) {
    entries.push({
      taskId,
      taskUuid,
      userId,
      userUuid,
      actionType: "FIELD_CHANGED",
      field: "DESCRIPTION",
      oldValue: normalizeDescription(previous.description),
      newValue: normalizeDescription(next.description),
    });
  }

  if (previous.assigneeId !== next.assigneeId) {
    entries.push({
      taskId,
      taskUuid,
      userId,
      userUuid,
      actionType: "FIELD_CHANGED",
      field: "ASSIGNEE",
      oldValue: previousAssigneeLabel,
      newValue: nextAssigneeLabel,
    });
  }

  if ((previous.dueDate ? normalizeDueDate(previous.dueDate) : null) !== normalizeDueDate(next.dueDate)) {
    entries.push({
      taskId,
      taskUuid,
      userId,
      userUuid,
      actionType: "FIELD_CHANGED",
      field: "DUE_DATE",
      oldValue: normalizeDueDate(previous.dueDate) ?? "(none)",
      newValue: normalizeDueDate(next.dueDate) ?? "(none)",
    });
  }

  if (previous.priority !== next.priority) {
    entries.push({
      taskId,
      taskUuid,
      userId,
      userUuid,
      actionType: "FIELD_CHANGED",
      field: "PRIORITY",
      oldValue: formatPriority(previous.priority),
      newValue: formatPriority(next.priority),
    });
  }

  if (previous.status !== next.status) {
    entries.push({
      taskId,
      taskUuid,
      userId,
      userUuid,
      actionType: "FIELD_CHANGED",
      field: "STATUS",
      oldValue: formatStatus(previous.status),
      newValue: formatStatus(next.status),
    });
  }

  return entries;
}

export async function insertTaskActivities(
  database: RawExecutor,
  entries: TaskActivityInsert[]
) {
  for (const entry of entries) {
    await database.$executeRaw`
      INSERT INTO "TaskActivity" (
        "taskId",
        "taskUuid",
        "userId",
        "userUuid",
        "actionType",
        "field",
        "oldValue",
        "newValue"
      )
      VALUES (
        ${entry.taskId},
        ${entry.taskUuid},
        ${entry.userId},
        ${entry.userUuid},
        ${entry.actionType},
        ${entry.field},
        ${entry.oldValue},
        ${entry.newValue}
      )
    `;
  }
}

function isMissingTableError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const maybeCode = (error as { code?: unknown }).code;
  if (maybeCode === "P2021") {
    return true;
  }

  if (maybeCode !== "P2010") {
    return false;
  }

  const maybeMeta = error as {
    meta?: {
      message?: unknown;
    };
    message?: unknown;
  };
  const details = `${String(maybeMeta.meta?.message ?? "")} ${String(maybeMeta.message ?? "")}`
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

async function ensureTaskActivitySchema(database: RawExecutor) {
  await database.$executeRaw`
    CREATE TABLE IF NOT EXISTS "TaskActivity" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "uuid" TEXT NOT NULL DEFAULT (
        lower(hex(randomblob(4))) || '-' ||
        lower(hex(randomblob(2))) || '-' ||
        '4' || substr(lower(hex(randomblob(2))), 2) || '-' ||
        substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))), 2) || '-' ||
        lower(hex(randomblob(6)))
      ),
      "taskId" INTEGER NOT NULL,
      "taskUuid" TEXT NOT NULL,
      "userId" INTEGER NOT NULL,
      "userUuid" TEXT NOT NULL,
      "actionType" TEXT NOT NULL CHECK ("actionType" IN ('CREATED', 'FIELD_CHANGED')),
      "field" TEXT CHECK ("field" IN ('TITLE', 'DESCRIPTION', 'ASSIGNEE', 'DUE_DATE', 'PRIORITY', 'STATUS')),
      "oldValue" TEXT,
      "newValue" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "TaskActivity_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "TaskActivity_taskUuid_fkey" FOREIGN KEY ("taskUuid") REFERENCES "Task" ("uuid") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "TaskActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AuthUser" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
      CONSTRAINT "TaskActivity_userUuid_fkey" FOREIGN KEY ("userUuid") REFERENCES "AuthUser" ("uuid") ON DELETE RESTRICT ON UPDATE CASCADE
    )
  `;
  await database.$executeRaw`
    CREATE UNIQUE INDEX IF NOT EXISTS "TaskActivity_uuid_key"
    ON "TaskActivity" ("uuid")
  `;
  await database.$executeRaw`
    CREATE INDEX IF NOT EXISTS "TaskActivity_taskId_createdAt_idx"
    ON "TaskActivity" ("taskId", "createdAt")
  `;
  await database.$executeRaw`
    CREATE INDEX IF NOT EXISTS "TaskActivity_taskUuid_createdAt_idx"
    ON "TaskActivity" ("taskUuid", "createdAt")
  `;
  await database.$executeRaw`
    CREATE INDEX IF NOT EXISTS "TaskActivity_userId_createdAt_idx"
    ON "TaskActivity" ("userId", "createdAt")
  `;
  await database.$executeRaw`
    CREATE INDEX IF NOT EXISTS "TaskActivity_userUuid_createdAt_idx"
    ON "TaskActivity" ("userUuid", "createdAt")
  `;
}

export async function insertTaskActivitiesBestEffort(
  database: RawExecutor,
  entries: TaskActivityInsert[]
) {
  if (entries.length === 0) {
    return;
  }

  try {
    await insertTaskActivities(database, entries);
  } catch (error) {
    if (isMissingTableError(error)) {
      try {
        await ensureTaskActivitySchema(database);
        await insertTaskActivities(database, entries);
      } catch (retryError) {
        if (isMissingTableError(retryError)) {
          return;
        }

        throw retryError;
      }

      return;
    }

    throw error;
  }
}
