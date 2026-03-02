import crypto from "crypto";

const PASSWORD_RESET_WINDOW_MS = 60 * 60 * 1000; // 1 hour

export function createPasswordResetToken() {
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashPasswordResetToken(token);
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_WINDOW_MS);

  return {
    token,
    tokenHash,
    expiresAt,
  };
}

export function hashPasswordResetToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function buildPasswordResetEmail(resetUrl: string) {
  return {
    subject: "Reset your password",
    text: [
      "A password reset was requested for your account.",
      `Reset your password: ${resetUrl}`,
      "This link expires in 1 hour.",
      "If you did not request this, you can ignore this email.",
    ].join("\n\n"),
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#0f172a">
        <h1 style="font-size:24px;margin:0 0 16px">Reset your password</h1>
        <p style="margin:0 0 16px;line-height:1.6">
          A password reset was requested for your account.
        </p>
        <p style="margin:0 0 24px">
          <a
            href="${resetUrl}"
            style="display:inline-block;padding:12px 18px;border-radius:999px;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:600"
          >
            Reset password
          </a>
        </p>
        <p style="margin:0 0 12px;line-height:1.6">
          If the button does not work, copy and paste this link into your browser:
        </p>
        <p style="margin:0 0 16px;word-break:break-word;line-height:1.6">
          <a href="${resetUrl}" style="color:#2563eb">${resetUrl}</a>
        </p>
        <p style="margin:0;color:#475569;line-height:1.6">
          This link expires in 1 hour. If you did not request this, you can ignore this email.
        </p>
      </div>
    `.trim(),
  };
}
