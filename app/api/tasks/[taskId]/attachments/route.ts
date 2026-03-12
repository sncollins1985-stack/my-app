import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { parseEntityIdentifier } from "@/lib/entity-id";
import {
  DEFAULT_DOCUMENT_MAX_UPLOAD_BYTES,
  DOCUMENT_MAX_UPLOAD_BYTES_ENV,
} from "@/lib/documents/constants";
import { buildDocumentStorageKey, safeDocumentDisplayName, sanitizeFilename } from "@/lib/documents/filename";
import {
  createDocumentRecord,
  DocumentValidationError,
  listTaskDocuments,
  resolveTaskContextByIdentifier,
} from "@/lib/documents/service";
import { getDocumentStorageProvider } from "@/lib/documents/storage";
import { insertTaskActivitiesBestEffort } from "@/lib/task-activity";
import { serializeTaskAttachmentActivityPayload } from "@/lib/task-attachment-activity";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

interface TaskAttachmentsRouteParams {
  params: Promise<{
    taskId: string;
  }>;
}

function getMaxUploadBytes() {
  const configured = Number(process.env[DOCUMENT_MAX_UPLOAD_BYTES_ENV]);
  if (Number.isInteger(configured) && configured > 0) {
    return configured;
  }

  return DEFAULT_DOCUMENT_MAX_UPLOAD_BYTES;
}

function formatIdentifierError(fieldName: string) {
  return `${fieldName} must be a UUID or positive integer`;
}

function serializeDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toISOString();
}

function isMissingDocumentsSchemaError(error: unknown) {
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

  return (
    details.includes("documents") ||
    details.includes("document_folders") ||
    details.includes("documentfolder")
  );
}

// GET /api/tasks/:taskId/attachments -> list task attachments (AUTH REQUIRED)
export async function GET(_request: Request, { params }: TaskAttachmentsRouteParams) {
  try {
    const authUser = await getCurrentUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const taskIdentifier = parseEntityIdentifier(resolvedParams.taskId);
    if (!taskIdentifier) {
      return NextResponse.json(
        { error: formatIdentifierError("taskId") },
        { status: 400 }
      );
    }

    const task = await resolveTaskContextByIdentifier(taskIdentifier);
    if (!task) {
      return NextResponse.json({ error: "Task was not found" }, { status: 404 });
    }

    const attachments = await listTaskDocuments(task.uuid);
    return NextResponse.json(
      attachments.map((item) => ({
        id: item.id,
        name: item.name,
        originalFilename: item.originalFilename,
        mimeType: item.mimeType,
        fileSizeBytes: item.fileSizeBytes,
        uploadedByUserId: item.uploadedByUserId,
        uploadedByName: item.uploadedByName,
        uploadedByEmail: item.uploadedByEmail,
        createdAt: serializeDate(item.createdAt),
      }))
    );
  } catch (error) {
    if (isMissingDocumentsSchemaError(error)) {
      return NextResponse.json([]);
    }

    console.error("GET /api/tasks/:taskId/attachments failed", error);
    return NextResponse.json({ error: "Failed to load task attachments" }, { status: 500 });
  }
}

// POST /api/tasks/:taskId/attachments -> upload task attachment (AUTH REQUIRED)
export async function POST(request: Request, { params }: TaskAttachmentsRouteParams) {
  const storageProvider = getDocumentStorageProvider();
  let storageKeyToCleanup: string | null = null;

  try {
    const authUser = await getCurrentUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const taskIdentifier = parseEntityIdentifier(resolvedParams.taskId);
    if (!taskIdentifier) {
      return NextResponse.json(
        { error: formatIdentifierError("taskId") },
        { status: 400 }
      );
    }

    const task = await resolveTaskContextByIdentifier(taskIdentifier);
    if (!task) {
      return NextResponse.json({ error: "Task was not found" }, { status: 404 });
    }

    const formData = await request.formData();
    const fileEntry = formData.get("file");

    if (!(fileEntry instanceof File)) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }

    if (fileEntry.size <= 0) {
      return NextResponse.json({ error: "file must not be empty" }, { status: 400 });
    }

    const maxUploadBytes = getMaxUploadBytes();
    if (fileEntry.size > maxUploadBytes) {
      return NextResponse.json(
        { error: `file must be ${maxUploadBytes} bytes or smaller` },
        { status: 413 }
      );
    }

    const originalFilename = fileEntry.name?.trim() || "file";
    const sanitizedFilename = sanitizeFilename(originalFilename);
    const documentId = crypto.randomUUID();
    const storageKey = buildDocumentStorageKey(documentId, sanitizedFilename);
    const mimeType = fileEntry.type?.trim() || "application/octet-stream";

    const fileBuffer = Buffer.from(await fileEntry.arrayBuffer());
    if (fileBuffer.length <= 0) {
      return NextResponse.json({ error: "file must not be empty" }, { status: 400 });
    }

    await storageProvider.put(
      {
        buffer: fileBuffer,
        contentType: mimeType,
      },
      storageKey
    );
    storageKeyToCleanup = storageKey;

    const document = await createDocumentRecord({
      id: documentId,
      taskId: task.uuid,
      documentFolderId: null,
      name: safeDocumentDisplayName(originalFilename),
      originalFilename,
      storageProvider: storageProvider.providerName,
      storageKey,
      mimeType,
      fileSizeBytes: fileBuffer.length,
      uploadedByUserId: authUser.uuid,
      requireParentContext: true,
    });

    try {
      await insertTaskActivitiesBestEffort(prisma, [
        {
          taskId: task.id,
          taskUuid: task.uuid,
          userId: authUser.id,
          userUuid: authUser.uuid,
          actionType: "FIELD_CHANGED",
          field: null,
          oldValue: null,
          newValue: serializeTaskAttachmentActivityPayload({
            kind: "ATTACHMENT_UPLOADED",
            documentId: document.id,
            filename: document.originalFilename,
          }),
        },
      ]);
    } catch (activityError) {
      console.error("Failed to insert task attachment upload activity", activityError);
    }

    storageKeyToCleanup = null;

    return NextResponse.json(
      {
        id: document.id,
        name: document.name,
        originalFilename: document.originalFilename,
        mimeType: document.mimeType,
        fileSizeBytes: document.fileSizeBytes,
        createdAt: serializeDate(document.createdAt),
      },
      { status: 201 }
    );
  } catch (error) {
    if (storageKeyToCleanup) {
      try {
        await storageProvider.delete(storageKeyToCleanup);
      } catch (cleanupError) {
        console.error("Failed to clean up stored document after DB failure", cleanupError);
      }
    }

    if (error instanceof DocumentValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { error: "A document with this storage key already exists" },
        { status: 409 }
      );
    }

    if (isMissingDocumentsSchemaError(error)) {
      return NextResponse.json(
        { error: "Document tables are missing. Apply the latest Prisma migration." },
        { status: 500 }
      );
    }

    console.error("POST /api/tasks/:taskId/attachments failed", error);
    return NextResponse.json({ error: "Failed to upload task attachment" }, { status: 500 });
  }
}
