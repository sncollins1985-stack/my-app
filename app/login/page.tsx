"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function seed() {
    const res = await fetch("/api/auth/seed", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return alert("Seed failed");
    alert(`Seeded user: ${data.username} / ${data.password} (dev only)`);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data?.error ?? "Login failed");
      return;
    }

    router.push("/dashboard");
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-6">
      <div className="w-full max-w-md rounded-2xl bg-white/10 backdrop-blur border border-white/15 shadow-xl p-6">
        <h1 className="text-2xl font-semibold text-white">Welcome back</h1>
        <p className="text-white/70 mt-1">Sign in to continue</p>

        <form onSubmit={onSubmit} className="mt-6 space-y-3">
          <input
            className="w-full rounded-xl bg-white/10 border border-white/15 text-white placeholder:text-white/50 p-3 outline-none focus:ring-2 focus:ring-indigo-400"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            className="w-full rounded-xl bg-white/10 border border-white/15 text-white placeholder:text-white/50 p-3 outline-none focus:ring-2 focus:ring-indigo-400"
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {error && <p className="text-red-300 text-sm">{error}</p>}

          <button
            className="w-full rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-medium p-3 transition disabled:opacity-60"
            disabled={loading}
            type="submit"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>

          <button
            type="button"
            className="w-full rounded-xl bg-white/10 hover:bg-white/15 text-white/90 p-3 transition"
            onClick={seed}
          >
            (Dev) Create admin user
          </button>
        </form>
      </div>
    </main>
  );
}