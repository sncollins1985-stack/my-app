import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseEntityIdentifier } from "@/lib/entity-id";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function PATCH(req: Request, context: RouteContext) {
  const authUser = await getCurrentUser();
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const userIdentifier = parseEntityIdentifier(id);
  if (!userIdentifier) {
    return NextResponse.json({ error: "Invalid user id. Expected UUID or positive integer." }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const firstName =
    typeof body.firstName === "string" ? body.firstName.trim() : "";
  const lastName = typeof body.lastName === "string" ? body.lastName.trim() : "";

  const updatedUser = await prisma.user.update({
    where: userIdentifier.kind === "uuid" ? { uuid: userIdentifier.uuid } : { id: userIdentifier.id },
    data: {
      firstName: firstName || null,
      lastName: lastName || null,
    },
  });

  return NextResponse.json(updatedUser);
}
