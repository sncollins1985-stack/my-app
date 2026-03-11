PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

-- Build UUID maps once so dependent tables can be backfilled deterministically.
CREATE TABLE "__uuid_User" (
  "id" INTEGER NOT NULL PRIMARY KEY,
  "uuid" TEXT NOT NULL
);

INSERT INTO "__uuid_User" ("id", "uuid")
SELECT
  u."id",
  (
    lower(hex(randomblob(4))) || '-' ||
    lower(hex(randomblob(2))) || '-' ||
    '4' || substr(lower(hex(randomblob(2))), 2) || '-' ||
    substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))), 2) || '-' ||
    lower(hex(randomblob(6)))
  )
FROM "User" u;

CREATE UNIQUE INDEX "__uuid_User_uuid_key" ON "__uuid_User" ("uuid");

CREATE TABLE "__uuid_AuthUser" (
  "id" INTEGER NOT NULL PRIMARY KEY,
  "uuid" TEXT NOT NULL
);

INSERT INTO "__uuid_AuthUser" ("id", "uuid")
SELECT
  au."id",
  (
    lower(hex(randomblob(4))) || '-' ||
    lower(hex(randomblob(2))) || '-' ||
    '4' || substr(lower(hex(randomblob(2))), 2) || '-' ||
    substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))), 2) || '-' ||
    lower(hex(randomblob(6)))
  )
FROM "AuthUser" au;

CREATE UNIQUE INDEX "__uuid_AuthUser_uuid_key" ON "__uuid_AuthUser" ("uuid");

CREATE TABLE "__uuid_Project" (
  "id" INTEGER NOT NULL PRIMARY KEY,
  "uuid" TEXT NOT NULL
);

INSERT INTO "__uuid_Project" ("id", "uuid")
SELECT
  p."id",
  (
    lower(hex(randomblob(4))) || '-' ||
    lower(hex(randomblob(2))) || '-' ||
    '4' || substr(lower(hex(randomblob(2))), 2) || '-' ||
    substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))), 2) || '-' ||
    lower(hex(randomblob(6)))
  )
FROM "Project" p;

CREATE UNIQUE INDEX "__uuid_Project_uuid_key" ON "__uuid_Project" ("uuid");

CREATE TABLE "__uuid_Task" (
  "id" INTEGER NOT NULL PRIMARY KEY,
  "uuid" TEXT NOT NULL
);

INSERT INTO "__uuid_Task" ("id", "uuid")
SELECT
  t."id",
  (
    lower(hex(randomblob(4))) || '-' ||
    lower(hex(randomblob(2))) || '-' ||
    '4' || substr(lower(hex(randomblob(2))), 2) || '-' ||
    substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))), 2) || '-' ||
    lower(hex(randomblob(6)))
  )
FROM "Task" t;

CREATE UNIQUE INDEX "__uuid_Task_uuid_key" ON "__uuid_Task" ("uuid");

-- Snapshot dependent rows before table rebuilds.
CREATE TABLE "__old_Session" AS SELECT * FROM "Session";
CREATE TABLE "__old_PasswordResetToken" AS SELECT * FROM "PasswordResetToken";
CREATE TABLE "__old_TaskComment" AS SELECT * FROM "TaskComment";
CREATE TABLE "__old_TaskActivity" AS SELECT * FROM "TaskActivity";
CREATE TABLE "__old_Task" AS SELECT * FROM "Task";

DROP TABLE "Session";
DROP TABLE "PasswordResetToken";
DROP TABLE "TaskComment";
DROP TABLE "TaskActivity";
DROP TABLE "Task";

CREATE TABLE "new_User" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "uuid" TEXT NOT NULL DEFAULT (
    lower(hex(randomblob(4))) || '-' ||
    lower(hex(randomblob(2))) || '-' ||
    '4' || substr(lower(hex(randomblob(2))), 2) || '-' ||
    substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))), 2) || '-' ||
    lower(hex(randomblob(6)))
  ),
  "email" TEXT NOT NULL,
  "firstName" TEXT,
  "lastName" TEXT,
  "lastLoggedIn" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO "new_User" ("id", "uuid", "email", "firstName", "lastName", "lastLoggedIn", "createdAt")
SELECT
  u."id",
  uu."uuid",
  u."email",
  u."firstName",
  u."lastName",
  u."lastLoggedIn",
  u."createdAt"
FROM "User" u
INNER JOIN "__uuid_User" uu ON uu."id" = u."id";

DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";

CREATE UNIQUE INDEX "User_uuid_key" ON "User"("uuid");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

CREATE TABLE "new_AuthUser" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "uuid" TEXT NOT NULL DEFAULT (
    lower(hex(randomblob(4))) || '-' ||
    lower(hex(randomblob(2))) || '-' ||
    '4' || substr(lower(hex(randomblob(2))), 2) || '-' ||
    substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))), 2) || '-' ||
    lower(hex(randomblob(6)))
  ),
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO "new_AuthUser" ("id", "uuid", "email", "passwordHash", "createdAt")
SELECT
  au."id",
  uau."uuid",
  au."email",
  au."passwordHash",
  au."createdAt"
FROM "AuthUser" au
INNER JOIN "__uuid_AuthUser" uau ON uau."id" = au."id";

DROP TABLE "AuthUser";
ALTER TABLE "new_AuthUser" RENAME TO "AuthUser";

CREATE UNIQUE INDEX "AuthUser_uuid_key" ON "AuthUser"("uuid");
CREATE UNIQUE INDEX "AuthUser_email_key" ON "AuthUser"("email");

CREATE TABLE "new_Project" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "uuid" TEXT NOT NULL DEFAULT (
    lower(hex(randomblob(4))) || '-' ||
    lower(hex(randomblob(2))) || '-' ||
    '4' || substr(lower(hex(randomblob(2))), 2) || '-' ||
    substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))), 2) || '-' ||
    lower(hex(randomblob(6)))
  ),
  "name" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO "new_Project" ("id", "uuid", "name", "description", "createdAt")
SELECT
  p."id",
  up."uuid",
  p."name",
  p."description",
  p."createdAt"
FROM "Project" p
INNER JOIN "__uuid_Project" up ON up."id" = p."id";

DROP TABLE "Project";
ALTER TABLE "new_Project" RENAME TO "Project";

CREATE UNIQUE INDEX "Project_uuid_key" ON "Project"("uuid");
CREATE INDEX "Project_createdAt_idx" ON "Project"("createdAt");

CREATE TABLE "new_Task" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "uuid" TEXT NOT NULL DEFAULT (
    lower(hex(randomblob(4))) || '-' ||
    lower(hex(randomblob(2))) || '-' ||
    '4' || substr(lower(hex(randomblob(2))), 2) || '-' ||
    substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))), 2) || '-' ||
    lower(hex(randomblob(6)))
  ),
  "title" TEXT NOT NULL,
  "description" TEXT,
  "assigneeId" INTEGER,
  "assigneeUuid" TEXT,
  "dueDate" DATETIME,
  "priority" TEXT NOT NULL DEFAULT 'MEDIUM' CHECK ("priority" IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  "status" TEXT NOT NULL DEFAULT 'NOT_STARTED' CHECK ("status" IN ('NOT_STARTED', 'IN_PROGRESS', 'BLOCKED', 'DONE')),
  "projectId" INTEGER,
  "projectUuid" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdByAuthUserId" INTEGER NOT NULL,
  "createdByAuthUserUuid" TEXT NOT NULL,
  "createdByEmail" TEXT NOT NULL,
  CONSTRAINT "Task_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "Task_assigneeUuid_fkey" FOREIGN KEY ("assigneeUuid") REFERENCES "User" ("uuid") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "Task_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "Task_projectUuid_fkey" FOREIGN KEY ("projectUuid") REFERENCES "Project" ("uuid") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "Task_createdByAuthUserId_fkey" FOREIGN KEY ("createdByAuthUserId") REFERENCES "AuthUser" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Task_createdByAuthUserUuid_fkey" FOREIGN KEY ("createdByAuthUserUuid") REFERENCES "AuthUser" ("uuid") ON DELETE RESTRICT ON UPDATE CASCADE
);

INSERT INTO "new_Task" (
  "id",
  "uuid",
  "title",
  "description",
  "assigneeId",
  "assigneeUuid",
  "dueDate",
  "priority",
  "status",
  "projectId",
  "projectUuid",
  "createdAt",
  "createdByAuthUserId",
  "createdByAuthUserUuid",
  "createdByEmail"
)
SELECT
  t."id",
  ut."uuid",
  t."title",
  t."description",
  t."assigneeId",
  uu."uuid",
  t."dueDate",
  t."priority",
  t."status",
  t."projectId",
  up."uuid",
  t."createdAt",
  t."createdByAuthUserId",
  uau."uuid",
  t."createdByEmail"
FROM "__old_Task" t
INNER JOIN "__uuid_Task" ut ON ut."id" = t."id"
LEFT JOIN "__uuid_User" uu ON uu."id" = t."assigneeId"
LEFT JOIN "__uuid_Project" up ON up."id" = t."projectId"
INNER JOIN "__uuid_AuthUser" uau ON uau."id" = t."createdByAuthUserId";

ALTER TABLE "new_Task" RENAME TO "Task";

CREATE UNIQUE INDEX "Task_uuid_key" ON "Task"("uuid");
CREATE INDEX "Task_createdAt_idx" ON "Task"("createdAt");
CREATE INDEX "Task_projectId_createdAt_idx" ON "Task"("projectId", "createdAt");
CREATE INDEX "Task_projectUuid_createdAt_idx" ON "Task"("projectUuid", "createdAt");
CREATE INDEX "Task_assigneeId_createdAt_idx" ON "Task"("assigneeId", "createdAt");
CREATE INDEX "Task_assigneeUuid_createdAt_idx" ON "Task"("assigneeUuid", "createdAt");
CREATE INDEX "Task_createdByAuthUserId_createdAt_idx" ON "Task"("createdByAuthUserId", "createdAt");
CREATE INDEX "Task_createdByAuthUserUuid_createdAt_idx" ON "Task"("createdByAuthUserUuid", "createdAt");

CREATE TABLE "new_Session" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "uuid" TEXT NOT NULL DEFAULT (
    lower(hex(randomblob(4))) || '-' ||
    lower(hex(randomblob(2))) || '-' ||
    '4' || substr(lower(hex(randomblob(2))), 2) || '-' ||
    substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))), 2) || '-' ||
    lower(hex(randomblob(6)))
  ),
  "token" TEXT NOT NULL,
  "userId" INTEGER NOT NULL,
  "userUuid" TEXT NOT NULL,
  "expiresAt" DATETIME NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AuthUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Session_userUuid_fkey" FOREIGN KEY ("userUuid") REFERENCES "AuthUser" ("uuid") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_Session" ("id", "uuid", "token", "userId", "userUuid", "expiresAt", "createdAt")
SELECT
  s."id",
  (
    lower(hex(randomblob(4))) || '-' ||
    lower(hex(randomblob(2))) || '-' ||
    '4' || substr(lower(hex(randomblob(2))), 2) || '-' ||
    substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))), 2) || '-' ||
    lower(hex(randomblob(6)))
  ),
  s."token",
  s."userId",
  uau."uuid",
  s."expiresAt",
  s."createdAt"
FROM "__old_Session" s
INNER JOIN "__uuid_AuthUser" uau ON uau."id" = s."userId";

ALTER TABLE "new_Session" RENAME TO "Session";

CREATE UNIQUE INDEX "Session_uuid_key" ON "Session"("uuid");
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");
CREATE INDEX "Session_userId_idx" ON "Session"("userId");
CREATE INDEX "Session_userUuid_idx" ON "Session"("userUuid");

CREATE TABLE "new_PasswordResetToken" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "uuid" TEXT NOT NULL DEFAULT (
    lower(hex(randomblob(4))) || '-' ||
    lower(hex(randomblob(2))) || '-' ||
    '4' || substr(lower(hex(randomblob(2))), 2) || '-' ||
    substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))), 2) || '-' ||
    lower(hex(randomblob(6)))
  ),
  "authUserId" INTEGER NOT NULL,
  "authUserUuid" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" DATETIME NOT NULL,
  "usedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PasswordResetToken_authUserId_fkey" FOREIGN KEY ("authUserId") REFERENCES "AuthUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PasswordResetToken_authUserUuid_fkey" FOREIGN KEY ("authUserUuid") REFERENCES "AuthUser" ("uuid") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_PasswordResetToken" (
  "id",
  "uuid",
  "authUserId",
  "authUserUuid",
  "tokenHash",
  "expiresAt",
  "usedAt",
  "createdAt"
)
SELECT
  prt."id",
  (
    lower(hex(randomblob(4))) || '-' ||
    lower(hex(randomblob(2))) || '-' ||
    '4' || substr(lower(hex(randomblob(2))), 2) || '-' ||
    substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))), 2) || '-' ||
    lower(hex(randomblob(6)))
  ),
  prt."authUserId",
  uau."uuid",
  prt."tokenHash",
  prt."expiresAt",
  prt."usedAt",
  prt."createdAt"
FROM "__old_PasswordResetToken" prt
INNER JOIN "__uuid_AuthUser" uau ON uau."id" = prt."authUserId";

ALTER TABLE "new_PasswordResetToken" RENAME TO "PasswordResetToken";

CREATE UNIQUE INDEX "PasswordResetToken_uuid_key" ON "PasswordResetToken"("uuid");
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");
CREATE INDEX "PasswordResetToken_authUserId_idx" ON "PasswordResetToken"("authUserId");
CREATE INDEX "PasswordResetToken_authUserUuid_idx" ON "PasswordResetToken"("authUserUuid");
CREATE INDEX "PasswordResetToken_expiresAt_idx" ON "PasswordResetToken"("expiresAt");

CREATE TABLE "new_TaskComment" (
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
  "authorUserId" INTEGER NOT NULL,
  "authorUserUuid" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TaskComment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "TaskComment_taskUuid_fkey" FOREIGN KEY ("taskUuid") REFERENCES "Task" ("uuid") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "TaskComment_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "AuthUser" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "TaskComment_authorUserUuid_fkey" FOREIGN KEY ("authorUserUuid") REFERENCES "AuthUser" ("uuid") ON DELETE RESTRICT ON UPDATE CASCADE
);

INSERT INTO "new_TaskComment" (
  "id",
  "uuid",
  "taskId",
  "taskUuid",
  "authorUserId",
  "authorUserUuid",
  "body",
  "createdAt",
  "updatedAt"
)
SELECT
  tc."id",
  (
    lower(hex(randomblob(4))) || '-' ||
    lower(hex(randomblob(2))) || '-' ||
    '4' || substr(lower(hex(randomblob(2))), 2) || '-' ||
    substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))), 2) || '-' ||
    lower(hex(randomblob(6)))
  ),
  tc."taskId",
  ut."uuid",
  tc."authorUserId",
  uau."uuid",
  tc."body",
  tc."createdAt",
  tc."updatedAt"
FROM "__old_TaskComment" tc
INNER JOIN "__uuid_Task" ut ON ut."id" = tc."taskId"
INNER JOIN "__uuid_AuthUser" uau ON uau."id" = tc."authorUserId";

ALTER TABLE "new_TaskComment" RENAME TO "TaskComment";

CREATE UNIQUE INDEX "TaskComment_uuid_key" ON "TaskComment"("uuid");
CREATE INDEX "TaskComment_taskId_createdAt_idx" ON "TaskComment"("taskId", "createdAt");
CREATE INDEX "TaskComment_taskUuid_createdAt_idx" ON "TaskComment"("taskUuid", "createdAt");
CREATE INDEX "TaskComment_authorUserId_createdAt_idx" ON "TaskComment"("authorUserId", "createdAt");
CREATE INDEX "TaskComment_authorUserUuid_createdAt_idx" ON "TaskComment"("authorUserUuid", "createdAt");

CREATE TABLE "new_TaskActivity" (
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
);

INSERT INTO "new_TaskActivity" (
  "id",
  "uuid",
  "taskId",
  "taskUuid",
  "userId",
  "userUuid",
  "actionType",
  "field",
  "oldValue",
  "newValue",
  "createdAt"
)
SELECT
  ta."id",
  (
    lower(hex(randomblob(4))) || '-' ||
    lower(hex(randomblob(2))) || '-' ||
    '4' || substr(lower(hex(randomblob(2))), 2) || '-' ||
    substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))), 2) || '-' ||
    lower(hex(randomblob(6)))
  ),
  ta."taskId",
  ut."uuid",
  ta."userId",
  uau."uuid",
  ta."actionType",
  ta."field",
  ta."oldValue",
  ta."newValue",
  ta."createdAt"
FROM "__old_TaskActivity" ta
INNER JOIN "__uuid_Task" ut ON ut."id" = ta."taskId"
INNER JOIN "__uuid_AuthUser" uau ON uau."id" = ta."userId";

ALTER TABLE "new_TaskActivity" RENAME TO "TaskActivity";

CREATE UNIQUE INDEX "TaskActivity_uuid_key" ON "TaskActivity"("uuid");
CREATE INDEX "TaskActivity_taskId_createdAt_idx" ON "TaskActivity"("taskId", "createdAt");
CREATE INDEX "TaskActivity_taskUuid_createdAt_idx" ON "TaskActivity"("taskUuid", "createdAt");
CREATE INDEX "TaskActivity_userId_createdAt_idx" ON "TaskActivity"("userId", "createdAt");
CREATE INDEX "TaskActivity_userUuid_createdAt_idx" ON "TaskActivity"("userUuid", "createdAt");

DROP TABLE "__old_Session";
DROP TABLE "__old_PasswordResetToken";
DROP TABLE "__old_TaskComment";
DROP TABLE "__old_TaskActivity";
DROP TABLE "__old_Task";

DROP TABLE "__uuid_User";
DROP TABLE "__uuid_AuthUser";
DROP TABLE "__uuid_Project";
DROP TABLE "__uuid_Task";

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
