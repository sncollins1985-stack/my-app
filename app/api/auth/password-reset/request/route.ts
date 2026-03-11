import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  buildPasswordResetEmail,
  createPasswordResetToken,
} from "@/lib/password-reset";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const genericResponse = NextResponse.json({
    ok: true,
    message: "If an account exists for that email, a reset link has been prepared.",
  });

  const authUser = await prisma.authUser.findUnique({ where: { email } });
  if (!authUser) {
    return genericResponse;
  }

  const { token, tokenHash, expiresAt } = createPasswordResetToken();
  const origin = new URL(req.url).origin;
  const resetUrl = `${origin}/reset-password?token=${token}`;
  const emailContent = buildPasswordResetEmail(resetUrl);

  await prisma.$transaction([
    prisma.passwordResetToken.deleteMany({
      where: {
        authUserId: authUser.id,
        usedAt: null,
      },
    }),
    prisma.passwordResetToken.create({
      data: {
        authUserId: authUser.id,
        authUserUuid: authUser.uuid,
        tokenHash,
        expiresAt,
      },
    }),
    prisma.outboundEmail.create({
      data: {
        to: email,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
        kind: "password_reset",
      },
    }),
  ]);

  return genericResponse;
}
