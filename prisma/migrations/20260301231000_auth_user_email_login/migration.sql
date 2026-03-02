PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_AuthUser" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO "new_AuthUser" ("id", "email", "passwordHash", "createdAt")
SELECT
    "id",
    CASE
        WHEN instr(lower(trim("username")), '@') > 0 THEN lower(trim("username"))
        ELSE lower(trim("username")) || '@example.com'
    END,
    "passwordHash",
    "createdAt"
FROM "AuthUser";

DROP TABLE "AuthUser";
ALTER TABLE "new_AuthUser" RENAME TO "AuthUser";

CREATE UNIQUE INDEX "AuthUser_email_key" ON "AuthUser"("email");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
