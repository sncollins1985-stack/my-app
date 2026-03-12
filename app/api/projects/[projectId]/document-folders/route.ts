import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { parseEntityIdentifier } from "@/lib/entity-id";
import {
  createProjectDocumentFolder,
  DocumentNotFoundError,
  DocumentValidationError,
  listProjectDocumentFolders,
} from "@/lib/documents/service";

interface ProjectDocumentFoldersRouteParams {
  params: Promise<{
    projectId: string;
  }>;
}

function serializeDate(value: Date | string | null) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toISOString();
}

function parseSortOrder(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "number" && Number.isInteger(value)) {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim();
    if (!normalized) {
      return null;
    }

    const parsed = Number(normalized);
    if (Number.isInteger(parsed)) {
      return parsed;
    }
  }

  return "invalid" as const;
}

function normalizeOptionalString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
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

  return details.includes("document_folders") || details.includes("documentfolder");
}

// GET /api/projects/:projectId/document-folders -> list folders (AUTH REQUIRED)
export async function GET(_request: Request, { params }: ProjectDocumentFoldersRouteParams) {
  try {
    const authUser = await getCurrentUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const projectIdentifier = parseEntityIdentifier(resolvedParams.projectId);
    if (!projectIdentifier) {
      return NextResponse.json(
        { error: "projectId must be a UUID or positive integer" },
        { status: 400 }
      );
    }

    const folders = await listProjectDocumentFolders(projectIdentifier);
    return NextResponse.json(
      folders.map((folder) => ({
        id: folder.id,
        projectId: folder.projectId,
        parentFolderId: folder.parentFolderId,
        name: folder.name,
        description: folder.description,
        sortOrder: folder.sortOrder,
        isSystem: folder.isSystem,
        createdByUserId: folder.createdByUserId,
        createdAt: serializeDate(folder.createdAt),
        updatedAt: serializeDate(folder.updatedAt),
        archivedAt: serializeDate(folder.archivedAt),
      }))
    );
  } catch (error) {
    if (error instanceof DocumentNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    if (isMissingDocumentsSchemaError(error)) {
      return NextResponse.json([]);
    }

    console.error("GET /api/projects/:projectId/document-folders failed", error);
    return NextResponse.json({ error: "Failed to load document folders" }, { status: 500 });
  }
}

// POST /api/projects/:projectId/document-folders -> create folder (AUTH REQUIRED)
export async function POST(request: Request, { params }: ProjectDocumentFoldersRouteParams) {
  try {
    const authUser = await getCurrentUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const projectIdentifier = parseEntityIdentifier(resolvedParams.projectId);
    if (!projectIdentifier) {
      return NextResponse.json(
        { error: "projectId must be a UUID or positive integer" },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const sortOrder = parseSortOrder(body.sortOrder);
    if (sortOrder === "invalid") {
      return NextResponse.json({ error: "sortOrder must be an integer" }, { status: 400 });
    }

    const createdFolder = await createProjectDocumentFolder({
      projectIdentifier,
      parentFolderId: normalizeOptionalString(body.parentFolderId),
      name: typeof body.name === "string" ? body.name : "",
      description: normalizeOptionalString(body.description),
      sortOrder,
      isSystem: body.isSystem === true,
      createdByUserId: authUser.uuid,
    });

    return NextResponse.json(
      {
        id: createdFolder.id,
        projectId: createdFolder.projectId,
        parentFolderId: createdFolder.parentFolderId,
        name: createdFolder.name,
        description: createdFolder.description,
        sortOrder: createdFolder.sortOrder,
        isSystem: createdFolder.isSystem,
        createdByUserId: createdFolder.createdByUserId,
        createdAt: serializeDate(createdFolder.createdAt),
        updatedAt: serializeDate(createdFolder.updatedAt),
        archivedAt: serializeDate(createdFolder.archivedAt),
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof DocumentValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (error instanceof DocumentNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { error: "A folder with this name already exists at this level" },
        { status: 409 }
      );
    }

    if (isMissingDocumentsSchemaError(error)) {
      return NextResponse.json(
        { error: "Document folder table is missing. Apply the latest Prisma migration." },
        { status: 500 }
      );
    }

    console.error("POST /api/projects/:projectId/document-folders failed", error);
    return NextResponse.json({ error: "Failed to create document folder" }, { status: 500 });
  }
}
