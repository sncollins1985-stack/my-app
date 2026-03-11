const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type EntityIdentifier =
  | { kind: "uuid"; uuid: string }
  | { kind: "int"; id: number };

function normalizeIdentifierInput(value: unknown) {
  if (typeof value === "number") {
    return Number.isInteger(value) && value > 0 ? String(value) : null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export function parseEntityIdentifier(value: unknown): EntityIdentifier | null {
  const normalized = normalizeIdentifierInput(value);
  if (!normalized) {
    return null;
  }

  if (UUID_PATTERN.test(normalized)) {
    return { kind: "uuid", uuid: normalized.toLowerCase() };
  }

  const parsedInt = Number(normalized);
  if (Number.isInteger(parsedInt) && parsedInt > 0) {
    return { kind: "int", id: parsedInt };
  }

  return null;
}

export function parseOptionalEntityIdentifier(
  value: unknown
): EntityIdentifier | null | "invalid" {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = parseEntityIdentifier(value);
  return parsed ?? "invalid";
}

export function matchesEntityIdentifier(
  identifier: EntityIdentifier,
  value: { id: number | null; uuid: string | null }
) {
  if (identifier.kind === "uuid") {
    return value.uuid?.toLowerCase() === identifier.uuid;
  }

  return value.id === identifier.id;
}
