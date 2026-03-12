export type TaskAttachmentActivityKind = "ATTACHMENT_UPLOADED" | "ATTACHMENT_DELETED";

export type TaskAttachmentActivityPayload = {
  kind: TaskAttachmentActivityKind;
  documentId: string;
  filename: string;
};

type UnknownRecord = Record<string, unknown>;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function serializeTaskAttachmentActivityPayload(payload: TaskAttachmentActivityPayload) {
  return JSON.stringify({
    kind: payload.kind,
    documentId: payload.documentId,
    filename: payload.filename,
  });
}

export function parseTaskAttachmentActivityPayload(
  value: string | null | undefined
): TaskAttachmentActivityPayload | null {
  if (!isNonEmptyString(value)) {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== "object") {
    return null;
  }

  const record = parsed as UnknownRecord;
  const kind = record.kind;
  if (kind !== "ATTACHMENT_UPLOADED" && kind !== "ATTACHMENT_DELETED") {
    return null;
  }

  if (!isNonEmptyString(record.documentId) || !isNonEmptyString(record.filename)) {
    return null;
  }

  return {
    kind,
    documentId: record.documentId.trim(),
    filename: record.filename.trim(),
  };
}
