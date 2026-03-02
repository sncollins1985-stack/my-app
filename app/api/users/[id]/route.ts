import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
  const userId = Number(id);

  if (!Number.isInteger(userId)) {
    return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const firstName =
    typeof body.firstName === "string" ? body.firstName.trim() : "";
  const lastName = typeof body.lastName === "string" ? body.lastName.trim() : "";

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      firstName: firstName || null,
      lastName: lastName || null,
    },
  });

  return NextResponse.json(updatedUser);
}
