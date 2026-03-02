import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request) {
  const authUser = await getCurrentUser();
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const firstName =
    typeof body.firstName === "string" ? body.firstName.trim() : "";
  const lastName = typeof body.lastName === "string" ? body.lastName.trim() : "";

  const user = await prisma.user.upsert({
    where: { email: authUser.email },
    update: {
      firstName: firstName || null,
      lastName: lastName || null,
    },
    create: {
      email: authUser.email,
      firstName: firstName || null,
      lastName: lastName || null,
    },
  });

  return NextResponse.json({
    ok: true,
    firstName: user.firstName,
    lastName: user.lastName,
  });
}
