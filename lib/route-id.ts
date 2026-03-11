export function getRouteId(entity: { id: number; uuid?: string | null }) {
  if (typeof entity.uuid === "string" && entity.uuid.trim().length > 0) {
    return entity.uuid;
  }

  return String(entity.id);
}
