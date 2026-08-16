import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { AuthShell } from "@/components/AuthShell";
import { requestAdminPasswordResetFn } from "@/lib/auth.functions";
import { safeReturnPath } from "@/lib/safe-redirect";

export const Route = createFileRoute("/admin_/forgot-password")({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: safeReturnPath(search["redirect"], "/admin/dashboard"),
  }),
  component: AdminForgotPasswordPage,
});

function AdminForgotPasswordPage() {
  const { redirect } = Route.useSearch();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    await requestAdminPasswordResetFn({ data: { email, redirect } });
    setBusy(false);
    setSent(true);
  }
  return (
    <AuthShell
      admin
      eyebrow="Administrator recovery"
      title="Recover secure admin access."
      description="Reset instructions are sent only to the matching platform administrator account."
    >
      <div>
        <h2 className="font-[family-name:var(--font-display)] text-3xl font-semibold">
          Forgot admin password
        </h2>
        {sent ? (
          <p className="mt-6 rounded-xl bg-forest/5 p-4 text-sm">
            If an eligible administrator account exists for that email, we've
            sent password reset instructions.
          </p>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-4">
            <input
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Administrator email"
              className="h-12 w-full rounded-2xl border border-border px-4"
            />
            <button
              disabled={busy}
              className="bg-gold-gradient h-12 w-full rounded-2xl font-bold text-gold-foreground disabled:opacity-60"
            >
              {busy ? "Sending…" : "Send reset instructions"}
            </button>
          </form>
        )}
        <p className="mt-6 text-center text-sm">
          <Link
            to="/admin"
            search={{ redirect }}
            className="font-bold text-primary"
          >
            Back to admin sign in
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
