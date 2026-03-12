CREATE TABLE "document_folders" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT (
    lower(hex(randomblob(4))) || '-' ||
    lower(hex(randomblob(2))) || '-' ||
    '4' || substr(lower(hex(randomblob(2))), 2) || '-' ||
    substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))), 2) || '-' ||
    lower(hex(randomblob(6)))
  ),
  "project_id" TEXT NOT NULL,
  "parent_folder_id" TEXT,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "sort_order" INTEGER,
  "is_system" BOOLEAN NOT NULL DEFAULT false,
  "created_by_user_id" TEXT,
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "archived_at" DATETIME,
  CONSTRAINT "document_folders_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "Project" ("uuid") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "document_folders_parent_folder_id_fkey" FOREIGN KEY ("parent_folder_id") REFERENCES "document_folders" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "document_folders_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "AuthUser" ("uuid") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "document_folders_project_parent_name_key"
ON "document_folders" ("project_id", "parent_folder_id", "name");

CREATE INDEX "document_folders_project_id_idx"
ON "document_folders" ("project_id");

CREATE INDEX "document_folders_parent_folder_id_idx"
ON "document_folders" ("parent_folder_id");

CREATE INDEX "document_folders_archived_at_idx"
ON "document_folders" ("archived_at");

CREATE TABLE "documents" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT (
    lower(hex(randomblob(4))) || '-' ||
    lower(hex(randomblob(2))) || '-' ||
    '4' || substr(lower(hex(randomblob(2))), 2) || '-' ||
    substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))), 2) || '-' ||
    lower(hex(randomblob(6)))
  ),
  "task_id" TEXT,
  "document_folder_id" TEXT,
  "name" TEXT NOT NULL,
  "original_filename" TEXT NOT NULL,
  "storage_provider" TEXT NOT NULL DEFAULT 'local',
  "storage_key" TEXT NOT NULL,
  "mime_type" TEXT NOT NULL,
  "file_size_bytes" INTEGER NOT NULL,
  "uploaded_by_user_id" TEXT NOT NULL,
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deleted_at" DATETIME,
  CONSTRAINT "documents_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "Task" ("uuid") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "documents_document_folder_id_fkey" FOREIGN KEY ("document_folder_id") REFERENCES "document_folders" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "documents_uploaded_by_user_id_fkey" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "AuthUser" ("uuid") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "documents_storage_key_key"
ON "documents" ("storage_key");

CREATE INDEX "documents_task_id_idx"
ON "documents" ("task_id");

CREATE INDEX "documents_document_folder_id_idx"
ON "documents" ("document_folder_id");

CREATE INDEX "documents_deleted_at_idx"
ON "documents" ("deleted_at");
