import { prisma } from "@/lib/prisma";
import { EntityIdentifier } from "@/lib/entity-id";

export class DocumentValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DocumentValidationError";
  }
}

export class DocumentNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DocumentNotFoundError";
  }
}

export type ResolvedTaskContext = {
  id: number;
  uuid: string;
};

export type ResolvedProjectContext = {
  id: number;
  uuid: string;
};

export type TaskDocumentListItem = {
  id: string;
  name: string;
  originalFilename: string;
  mimeType: string;
  fileSizeBytes: number;
  storageProvider: string;
  uploadedByUserId: string;
  uploadedByName: string;
  uploadedByEmail: string;
  createdAt: Date;
};

export type CreateDocumentRecordInput = {
  id?: string;
  taskId?: string | null;
  documentFolderId?: string | null;
  name: string;
  originalFilename: string;
  storageProvider?: string;
  storageKey: string;
  mimeType: string;
  fileSizeBytes: number;
  uploadedByUserId: string;
  requireParentContext?: boolean;
};

export type CreateDocumentFolderInput = {
  projectIdentifier: EntityIdentifier;
  parentFolderId?: string | null;
  name: string;
  description?: string | null;
  sortOrder?: number | null;
  isSystem?: boolean;
  createdByUserId?: string | null;
};

function formatDisplayName(params: { firstName: string | null; lastName: string | null; fallback: string }) {
  const fullName = [params.firstName ?? "", params.lastName ?? ""].join(" ").trim();
  return fullName || params.fallback;
}

function normalizeOptionalString(value: string | null | undefined) {
  const normalized = value?.trim() ?? "";
  return normalized.length > 0 ? normalized : null;
}

function normalizeSortOrder(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return null;
  }

  return Number.isInteger(value) ? value : null;
}

export async function resolveTaskContextByIdentifier(identifier: EntityIdentifier) {
  const task = await prisma.task.findUnique({
    where: identifier.kind === "uuid" ? { uuid: identifier.uuid } : { id: identifier.id },
    select: { id: true, uuid: true },
  });

  if (!task) {
    return null;
  }

  return {
    id: task.id,
    uuid: task.uuid,
  } satisfies ResolvedTaskContext;
}

export async function resolveProjectContextByIdentifier(identifier: EntityIdentifier) {
  const project = await prisma.project.findUnique({
    where: identifier.kind === "uuid" ? { uuid: identifier.uuid } : { id: identifier.id },
    select: { id: true, uuid: true },
  });

  if (!project) {
    return null;
  }

  return {
    id: project.id,
    uuid: project.uuid,
  } satisfies ResolvedProjectContext;
}

async function validateDocumentParentContexts(params: {
  taskId: string | null;
  documentFolderId: string | null;
  requireParentContext: boolean;
}) {
  const { taskId, documentFolderId, requireParentContext } = params;

  if (requireParentContext && !taskId && !documentFolderId) {
    throw new DocumentValidationError(
      "Document must be associated with at least one parent context"
    );
  }

  if (taskId) {
    const task = await prisma.task.findUnique({
      where: { uuid: taskId },
      select: { uuid: true },
    });

    if (!task) {
      throw new DocumentValidationError("Task was not found");
    }
  }

  if (documentFolderId) {
    const folder = await prisma.documentFolder.findUnique({
      where: { id: documentFolderId },
      select: { id: true },
    });

    if (!folder) {
      throw new DocumentValidationError("Document folder was not found");
    }
  }
}

export async function createDocumentRecord(input: CreateDocumentRecordInput) {
  const taskId = normalizeOptionalString(input.taskId);
  const documentFolderId = normalizeOptionalString(input.documentFolderId);
  const name = normalizeOptionalString(input.name);
  const originalFilename = normalizeOptionalString(input.originalFilename);
  const storageProvider = normalizeOptionalString(input.storageProvider) ?? "local";
  const storageKey = normalizeOptionalString(input.storageKey);
  const mimeType = normalizeOptionalString(input.mimeType);
  const uploadedByUserId = normalizeOptionalString(input.uploadedByUserId);

  if (!name) {
    throw new DocumentValidationError("Document name is required");
  }

  if (!originalFilename) {
    throw new DocumentValidationError("Document original filename is required");
  }

  if (!storageKey) {
    throw new DocumentValidationError("Document storage key is required");
  }

  if (!mimeType) {
    throw new DocumentValidationError("Document MIME type is required");
  }

  if (!uploadedByUserId) {
    throw new DocumentValidationError("Document uploader is required");
  }

  if (!Number.isInteger(input.fileSizeBytes) || input.fileSizeBytes <= 0) {
    throw new DocumentValidationError("Document file size must be a positive integer");
  }

  const uploader = await prisma.authUser.findUnique({
    where: { uuid: uploadedByUserId },
    select: { uuid: true },
  });
  if (!uploader) {
    throw new DocumentValidationError("Uploading user was not found");
  }

  await validateDocumentParentContexts({
    taskId,
    documentFolderId,
    requireParentContext: input.requireParentContext ?? true,
  });

  return prisma.document.create({
    data: {
      id: input.id,
      taskId,
      documentFolderId,
      name,
      originalFilename,
      storageProvider,
      storageKey,
      mimeType,
      fileSizeBytes: input.fileSizeBytes,
      uploadedByUserId,
    },
  });
}

export async function listTaskDocuments(taskId: string): Promise<TaskDocumentListItem[]> {
  const taskUuid = normalizeOptionalString(taskId);
  if (!taskUuid) {
    throw new DocumentValidationError("Task id is required");
  }

  const rows = await prisma.document.findMany({
    where: {
      taskId: taskUuid,
      deletedAt: null,
    },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      uploadedByUser: {
        select: {
          uuid: true,
          email: true,
        },
      },
    },
  });

  const emails = Array.from(
    new Set(
      rows
        .map((row) => row.uploadedByUser.email.trim().toLowerCase())
        .filter((email) => email.length > 0)
    )
  );

  const usersByEmail = new Map<string, { firstName: string | null; lastName: string | null }>();
  if (emails.length > 0) {
    const users = await prisma.user.findMany({
      where: {
        email: {
          in: emails,
        },
      },
      select: {
        email: true,
        firstName: true,
        lastName: true,
      },
    });

    for (const user of users) {
      usersByEmail.set(user.email.trim().toLowerCase(), {
        firstName: user.firstName,
        lastName: user.lastName,
      });
    }
  }

  return rows.map((row) => {
    const uploaderEmail = row.uploadedByUser.email;
    const userRecord = usersByEmail.get(uploaderEmail.trim().toLowerCase());

    return {
      id: row.id,
      name: row.name,
      originalFilename: row.originalFilename,
      mimeType: row.mimeType,
      fileSizeBytes: row.fileSizeBytes,
      storageProvider: row.storageProvider,
      uploadedByUserId: row.uploadedByUserId,
      uploadedByName: formatDisplayName({
        firstName: userRecord?.firstName ?? null,
        lastName: userRecord?.lastName ?? null,
        fallback: uploaderEmail,
      }),
      uploadedByEmail: uploaderEmail,
      createdAt: row.createdAt,
    } satisfies TaskDocumentListItem;
  });
}

export async function getActiveDocumentById(documentId: string) {
  const normalizedId = normalizeOptionalString(documentId);
  if (!normalizedId) {
    throw new DocumentValidationError("Document id is required");
  }

  const document = await prisma.document.findUnique({
    where: { id: normalizedId },
  });

  if (!document || document.deletedAt !== null) {
    return null;
  }

  return document;
}

export async function softDeleteDocumentById(documentId: string) {
  const normalizedId = normalizeOptionalString(documentId);
  if (!normalizedId) {
    throw new DocumentValidationError("Document id is required");
  }

  const existing = await prisma.document.findUnique({
    where: { id: normalizedId },
    select: {
      id: true,
      deletedAt: true,
    },
  });

  if (!existing || existing.deletedAt !== null) {
    return null;
  }

  return prisma.document.update({
    where: { id: normalizedId },
    data: {
      deletedAt: new Date(),
    },
    select: {
      id: true,
      deletedAt: true,
    },
  });
}

export async function createProjectDocumentFolder(input: CreateDocumentFolderInput) {
  const name = normalizeOptionalString(input.name);
  if (!name) {
    throw new DocumentValidationError("Folder name is required");
  }

  const project = await resolveProjectContextByIdentifier(input.projectIdentifier);
  if (!project) {
    throw new DocumentNotFoundError("Project was not found");
  }

  const parentFolderId = normalizeOptionalString(input.parentFolderId);
  if (parentFolderId) {
    const parentFolder = await prisma.documentFolder.findUnique({
      where: { id: parentFolderId },
      select: {
        id: true,
        projectId: true,
        archivedAt: true,
      },
    });

    if (!parentFolder) {
      throw new DocumentValidationError("Parent folder was not found");
    }

    if (parentFolder.archivedAt !== null) {
      throw new DocumentValidationError("Parent folder is archived");
    }

    if (parentFolder.projectId !== project.uuid) {
      throw new DocumentValidationError("Parent folder does not belong to this project");
    }
  }

  const createdByUserId = normalizeOptionalString(input.createdByUserId);
  if (createdByUserId) {
    const user = await prisma.authUser.findUnique({
      where: { uuid: createdByUserId },
      select: { uuid: true },
    });

    if (!user) {
      throw new DocumentValidationError("Folder creator user was not found");
    }
  }

  return prisma.documentFolder.create({
    data: {
      projectId: project.uuid,
      parentFolderId,
      name,
      description: normalizeOptionalString(input.description),
      sortOrder: normalizeSortOrder(input.sortOrder),
      isSystem: input.isSystem ?? false,
      createdByUserId,
    },
  });
}

export async function listProjectDocumentFolders(projectIdentifier: EntityIdentifier) {
  const project = await resolveProjectContextByIdentifier(projectIdentifier);
  if (!project) {
    throw new DocumentNotFoundError("Project was not found");
  }

  return prisma.documentFolder.findMany({
    where: {
      projectId: project.uuid,
      archivedAt: null,
    },
    orderBy: [
      {
        sortOrder: "asc",
      },
      {
        name: "asc",
      },
      {
        createdAt: "asc",
      },
    ],
  });
}
