import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { getPasswordPolicyError } from "@/lib/password-policy";
import { prisma } from "@/lib/prisma";
import { hashPasswordResetToken } from "@/lib/password-reset";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const token = typeof body.token === "string" ? body.token.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!token || !password) {
    return NextResponse.json(
      { error: "Token and password are required" },
      { status: 400 }
    );
  }

  const passwordPolicyError = getPasswordPolicyError(password);
  if (passwordPolicyError) {
    return NextResponse.json({ error: passwordPolicyError }, { status: 400 });
  }

  const tokenHash = hashPasswordResetToken(token);
  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { authUser: true },
  });

  if (
    !resetToken ||
    resetToken.usedAt !== null ||
    resetToken.expiresAt < new Date()
  ) {
    return NextResponse.json(
      { error: "This reset link is invalid or has expired" },
      { status: 400 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.$transaction([
    prisma.authUser.update({
      where: { id: resetToken.authUserId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() },
    }),
    prisma.passwordResetToken.deleteMany({
      where: {
        authUserId: resetToken.authUserId,
        id: { not: resetToken.id },
      },
    }),
    prisma.session.deleteMany({
      where: { userId: resetToken.authUserId },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
