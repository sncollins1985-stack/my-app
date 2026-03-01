import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST() {
  // Block in production (and generally anytime NODE_ENV isn't development)
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const username = "admin";
  const password = "admin123"; // change later

  const existing = await prisma.authUser.findUnique({ where: { username } });
  if (existing) {
    return NextResponse.json({ ok: true, message: "Already seeded" });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.authUser.create({
    data: { username, passwordHash },
  });

  // Return creds only in dev
  return NextResponse.json({ ok: true, username, password });
}