CREATE TABLE "TaskActivity" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "taskId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "actionType" TEXT NOT NULL CHECK ("actionType" IN ('CREATED', 'FIELD_CHANGED')),
    "field" TEXT CHECK ("field" IN ('TITLE', 'DESCRIPTION', 'ASSIGNEE', 'DUE_DATE', 'PRIORITY', 'STATUS')),
    "oldValue" TEXT,
    "newValue" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TaskActivity_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TaskActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AuthUser" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "TaskActivity_taskId_createdAt_idx" ON "TaskActivity"("taskId", "createdAt");
CREATE INDEX "TaskActivity_userId_createdAt_idx" ON "TaskActivity"("userId", "createdAt");
