"use client";

import Link from "next/link";
import { useState } from "react";

interface ResetPasswordFormProps {
  token: string;
}

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!token) {
      setError("This reset link is invalid or has expired");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    const response = await fetch("/api/auth/password-reset/confirm", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        token,
        password,
      }),
    });

    setLoading(false);

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(payload?.error ?? "Unable to reset password");
      return;
    }

    setSuccess(true);
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#172554,#020617_55%)] px-6 py-16 text-white">
      <div className="mx-auto w-full max-w-md rounded-[28px] border border-white/10 bg-white/10 p-8 shadow-2xl backdrop-blur">
        <h1 className="text-3xl font-semibold tracking-tight">Choose a new password</h1>
        <p className="mt-2 text-sm text-white/70">
          Set a new password for your account and then sign back in.
        </p>

        {success ? (
          <div className="mt-8 rounded-2xl border border-emerald-400/25 bg-emerald-400/10 p-4 text-sm text-emerald-100">
            <p>Your password has been reset.</p>
            <Link
              href="/login"
              className="mt-4 inline-flex rounded-full bg-white/90 px-4 py-2 font-medium text-slate-950 transition hover:bg-white"
            >
              Go to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="New password"
              className="w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-white outline-none transition placeholder:text-white/45 focus:ring-2 focus:ring-sky-400"
            />
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Confirm new password"
              className="w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-white outline-none transition placeholder:text-white/45 focus:ring-2 focus:ring-sky-400"
            />

            {error ? <p className="text-sm text-red-300">{error}</p> : null}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-sky-500 px-4 py-3 font-medium text-white transition hover:bg-sky-400 disabled:opacity-60"
            >
              {loading ? "Resetting password..." : "Reset password"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
