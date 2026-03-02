"use client";

import Link from "next/link";
import { useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    const response = await fetch("/api/auth/password-reset/request", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    });

    setLoading(false);

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(payload?.error ?? "Unable to prepare reset email");
      return;
    }

    setSuccess(
      payload?.message ??
        "If an account exists for that email, a reset link has been prepared."
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#1e293b,#020617_55%)] px-6 py-16 text-white">
      <div className="mx-auto w-full max-w-md rounded-[28px] border border-white/10 bg-white/10 p-8 shadow-2xl backdrop-blur">
        <h1 className="text-3xl font-semibold tracking-tight">Reset password</h1>
        <p className="mt-2 text-sm text-white/70">
          Enter the email address for the account you want to reset.
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email address"
            className="w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-white outline-none transition placeholder:text-white/45 focus:ring-2 focus:ring-sky-400"
          />

          {error ? <p className="text-sm text-red-300">{error}</p> : null}
          {success ? (
            <div className="rounded-2xl border border-emerald-400/25 bg-emerald-400/10 p-4 text-sm text-emerald-100">
              <p>{success}</p>
              <div className="mt-3 flex flex-wrap gap-3">
                <Link
                  href="/dev/outbox"
                  className="rounded-full bg-white/90 px-4 py-2 font-medium text-slate-950 transition hover:bg-white"
                >
                  Open outbox
                </Link>
                <Link
                  href="/login"
                  className="rounded-full border border-white/20 px-4 py-2 font-medium text-white transition hover:bg-white/10"
                >
                  Back to sign in
                </Link>
              </div>
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-sky-500 px-4 py-3 font-medium text-white transition hover:bg-sky-400 disabled:opacity-60"
          >
            {loading ? "Preparing reset..." : "Prepare reset email"}
          </button>
        </form>

        <div className="mt-6 text-sm text-white/70">
          <Link href="/login" className="transition hover:text-white">
            Return to sign in
          </Link>
        </div>
      </div>
    </main>
  );
}
