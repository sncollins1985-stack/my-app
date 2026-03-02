import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getPasswordPolicyError } from "@/lib/password-policy";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const authUser = await getCurrentUser();
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const currentPassword =
    typeof body.currentPassword === "string" ? body.currentPassword : "";
  const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";

  if (!currentPassword || !newPassword) {
    return NextResponse.json(
      { error: "Current password and new password are required" },
      { status: 400 }
    );
  }

  const passwordPolicyError = getPasswordPolicyError(newPassword);
  if (passwordPolicyError) {
    return NextResponse.json({ error: passwordPolicyError }, { status: 400 });
  }

  const matchesCurrentPassword = await bcrypt.compare(
    currentPassword,
    authUser.passwordHash
  );

  if (!matchesCurrentPassword) {
    return NextResponse.json(
      { error: "Current password is incorrect" },
      { status: 400 }
    );
  }

  const nextPasswordHash = await bcrypt.hash(newPassword, 10);

  await prisma.authUser.update({
    where: { id: authUser.id },
    data: { passwordHash: nextPasswordHash },
  });

  return NextResponse.json({ ok: true });
}
