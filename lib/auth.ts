import crypto from "crypto";
import { cookies } from "next/headers";
import { prisma } from "./prisma";

const COOKIE_NAME = "session_token";
const SESSION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// Create a new session (one session per user)
export async function createSession(userId: number, userUuid: string) {
  // Optional hardening: remove any existing sessions for this user
  await prisma.session.deleteMany({ where: { userId } });

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_MS);

  await prisma.session.create({
    data: { token, userId, userUuid, expiresAt },
  });

  const cookieStore = await cookies();

  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/",
  });
}

// Validate session and return the logged-in user
export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!session) return null;

  // Expired session cleanup
  if (session.expiresAt < new Date()) {
    await prisma.session.deleteMany({ where: { token } });
    cookieStore.delete(COOKIE_NAME);
    return null;
  }

  return session.user;
}

// Log out user
export async function logout() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (token) {
    await prisma.session.deleteMany({ where: { token } });
  }

  cookieStore.delete(COOKIE_NAME);
}
