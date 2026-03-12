import { NextResponse } from "next/server";
import {
  DocumentValidationError,
  getActiveDocumentById,
  resolveTaskContextByIdentifier,
  softDeleteDocumentById,
} from "@/lib/documents/service";
import { getCurrentUser } from "@/lib/auth";
import { parseEntityIdentifier } from "@/lib/entity-id";
import { insertTaskActivitiesBestEffort } from "@/lib/task-activity";
import { serializeTaskAttachmentActivityPayload } from "@/lib/task-attachment-activity";
import { prisma } from "@/lib/prisma";

interface DocumentRouteParams {
  params: Promise<{
    documentId: string;
  }>;
}

function serializeDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toISOString();
}

// DELETE /api/documents/:documentId -> soft delete document metadata (AUTH REQUIRED)
export async function DELETE(_request: Request, { params }: DocumentRouteParams) {
  try {
    const authUser = await getCurrentUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const documentIdentifier = parseEntityIdentifier(resolvedParams.documentId);
    if (!documentIdentifier || documentIdentifier.kind !== "uuid") {
      return NextResponse.json({ error: "documentId must be a UUID" }, { status: 400 });
    }

    const activeDocument = await getActiveDocumentById(documentIdentifier.uuid);
    if (!activeDocument) {
      return NextResponse.json({ error: "Document was not found" }, { status: 404 });
    }

    const taskContext = activeDocument.taskId
      ? await resolveTaskContextByIdentifier({ kind: "uuid", uuid: activeDocument.taskId })
      : null;

    const deletedDocument = await softDeleteDocumentById(documentIdentifier.uuid);
    if (!deletedDocument || !deletedDocument.deletedAt) {
      return NextResponse.json({ error: "Document was not found" }, { status: 404 });
    }

    if (taskContext) {
      try {
        await insertTaskActivitiesBestEffort(prisma, [
          {
            taskId: taskContext.id,
            taskUuid: taskContext.uuid,
            userId: authUser.id,
            userUuid: authUser.uuid,
            actionType: "FIELD_CHANGED",
            field: null,
            oldValue: null,
            newValue: serializeTaskAttachmentActivityPayload({
              kind: "ATTACHMENT_DELETED",
              documentId: activeDocument.id,
              filename: activeDocument.originalFilename,
            }),
          },
        ]);
      } catch (activityError) {
        console.error("Failed to insert task attachment delete activity", activityError);
      }
    }

    return NextResponse.json({
      id: deletedDocument.id,
      deletedAt: serializeDate(deletedDocument.deletedAt),
    });
  } catch (error) {
    if (error instanceof DocumentValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error("DELETE /api/documents/:documentId failed", error);
    return NextResponse.json({ error: "Failed to delete document" }, { status: 500 });
  }
}
