import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/users -> list users (AUTH REQUIRED)
export async function GET() {
  const authUser = await getCurrentUser();
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const users = await prisma.user.findMany({ orderBy: { id: "asc" } });
  return NextResponse.json(users);
}

// POST /api/users -> create user (AUTH REQUIRED)
export async function POST(req: Request) {
  const authUser = await getCurrentUser();
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const name = typeof body.name === "string" ? body.name.trim() : null;
  const firstName = name && name.length > 0 ? name : null;

  if (!email) {
    return NextResponse.json({ error: "email is required" }, { status: 400 });
  }

  try {
    const existingUsers = await prisma.$queryRaw<Array<{ id: number }>>`
      SELECT id
      FROM "User"
      WHERE lower(email) = lower(${email})
      LIMIT 1
    `;

    if (existingUsers.length > 0) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 409 }
      );
    }

    const user = await prisma.user.create({
      data: { email, firstName, lastName: null },
    });
    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 409 }
      );
    }

    return NextResponse.json({ error: "Failed to create user" }, { status: 400 });
  }
}
