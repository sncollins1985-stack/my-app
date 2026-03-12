import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { parseEntityIdentifier } from "@/lib/entity-id";
import { getActiveDocumentById } from "@/lib/documents/service";
import {
  DocumentStorageFileNotFoundError,
  getDocumentStorageProvider,
} from "@/lib/documents/storage";
import { sanitizeFilename } from "@/lib/documents/filename";

export const runtime = "nodejs";

interface DocumentDownloadRouteParams {
  params: Promise<{
    documentId: string;
  }>;
}

function buildContentDisposition(filename: string) {
  const fallbackFilename = sanitizeFilename(filename || "download").replace(/["\\]/g, "-");
  const encodedFilename = encodeURIComponent(filename || fallbackFilename);
  return {
    attachment: `attachment; filename="${fallbackFilename}"; filename*=UTF-8''${encodedFilename}`,
    inline: `inline; filename="${fallbackFilename}"; filename*=UTF-8''${encodedFilename}`,
  } as const;
}

// GET /api/documents/:documentId/download -> stream document content (AUTH REQUIRED)
export async function GET(request: Request, { params }: DocumentDownloadRouteParams) {
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

    const document = await getActiveDocumentById(documentIdentifier.uuid);
    if (!document) {
      return NextResponse.json({ error: "Document was not found" }, { status: 404 });
    }

    const provider = getDocumentStorageProvider(document.storageProvider);
    const opened = await provider.open(document.storageKey);
    const requestUrl = new URL(request.url);
    const disposition = requestUrl.searchParams.get("disposition") === "inline" ? "inline" : "attachment";
    const contentDisposition = buildContentDisposition(document.originalFilename || document.name);

    return new Response(Readable.toWeb(opened.stream) as ReadableStream<Uint8Array>, {
      status: 200,
      headers: {
        "Content-Type": document.mimeType || "application/octet-stream",
        "Content-Length": String(opened.contentLength),
        "Content-Disposition": contentDisposition[disposition],
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    if (error instanceof DocumentStorageFileNotFoundError) {
      return NextResponse.json({ error: "Document file was not found" }, { status: 404 });
    }

    console.error("GET /api/documents/:documentId/download failed", error);
    return NextResponse.json({ error: "Failed to download document" }, { status: 500 });
  }
}
