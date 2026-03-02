import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const identifier =
    typeof body.email === "string"
      ? body.email
      : typeof body.username === "string"
        ? body.username
        : "";
  const normalizedIdentifier = identifier.trim().toLowerCase();
  const password = typeof body.password === "string" ? body.password : "";

  if (!normalizedIdentifier || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }

  const fallbackEmail = normalizedIdentifier.includes("@")
    ? normalizedIdentifier
    : `${normalizedIdentifier}@example.com`;
  const user = await prisma.authUser.findFirst({
    where: {
      OR: [{ email: normalizedIdentifier }, { email: fallbackEmail }],
    },
  });
  if (!user) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

  const lastLoggedInAt = new Date();

  await prisma.user.upsert({
    where: { email: user.email },
    update: { lastLoggedIn: lastLoggedInAt },
    create: { email: user.email, lastLoggedIn: lastLoggedInAt },
  });

  await createSession(user.id);
  return NextResponse.json({ ok: true });
}
