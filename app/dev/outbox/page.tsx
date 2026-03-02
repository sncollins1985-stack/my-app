import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

export default async function DevOutboxPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  const emails = await prisma.outboundEmail.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fafc,#e2e8f0)] px-6 py-10 text-slate-950">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <div className="flex flex-col gap-4 rounded-[28px] border border-slate-200 bg-white/80 p-8 shadow-lg backdrop-blur md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500">
              Dev Outbox
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              Intercepted emails in the browser
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Password reset emails are stored here instead of being sent. Open the
              latest reset email and follow its link exactly as a recipient would.
            </p>
          </div>

          <div className="flex gap-3">
            <Link
              href="/forgot-password"
              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              Request reset
            </Link>
            <Link
              href="/login"
              className="rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Sign in
            </Link>
          </div>
        </div>

        {emails.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-slate-300 bg-white/70 p-10 text-center text-slate-600">
            No intercepted emails yet.
          </div>
        ) : (
          emails.map((email) => (
            <article
              key={email.id}
              className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm"
            >
              <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{email.subject}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      To: <span className="font-medium text-slate-900">{email.to}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-xs uppercase tracking-[0.24em] text-slate-500">
                    <span>{email.kind.replaceAll("_", " ")}</span>
                    <span>{formatDate(email.createdAt)}</span>
                  </div>
                </div>
              </div>

              <div className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
                <div
                  className="prose max-w-none prose-slate rounded-3xl border border-slate-200 bg-white p-6"
                  dangerouslySetInnerHTML={{ __html: email.html }}
                />
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Plain text
                  </h2>
                  <pre className="mt-4 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">
                    {email.text}
                  </pre>
                </div>
              </div>
            </article>
          ))
        )}
      </div>
    </main>
  );
}
