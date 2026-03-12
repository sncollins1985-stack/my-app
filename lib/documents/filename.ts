const INVALID_FILENAME_CHARACTERS = /[<>:"/\\|?*\x00-\x1f]/g;
const NON_ASCII_CHARACTERS = /[^\x20-\x7E]/g;
const MULTIPLE_DASHES = /-+/g;

function collapseWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function removePathSegments(value: string) {
  const normalized = value.replace(/\\/g, "/");
  const segments = normalized.split("/").filter((segment) => segment.trim().length > 0);
  return segments.length > 0 ? segments[segments.length - 1] : value;
}

export function sanitizeFilename(input: string) {
  const trimmedInput = collapseWhitespace(input);
  const baseInput = removePathSegments(trimmedInput || "file");

  const sanitized = baseInput
    .normalize("NFKD")
    .replace(NON_ASCII_CHARACTERS, "")
    .replace(INVALID_FILENAME_CHARACTERS, "-")
    .replace(/[^a-zA-Z0-9._\- ]/g, "-")
    .replace(/ /g, "-")
    .replace(MULTIPLE_DASHES, "-")
    .replace(/^[.-]+|[.-]+$/g, "");

  return sanitized || "file";
}

export function buildDocumentStorageKey(documentId: string, sanitizedFilename: string) {
  return `documents/${documentId}/${sanitizeFilename(sanitizedFilename)}`;
}

export function safeDocumentDisplayName(value: string) {
  const normalized = collapseWhitespace(value);
  return normalized.length > 0 ? normalized : "Untitled document";
}
