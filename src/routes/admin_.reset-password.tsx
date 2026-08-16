import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { AuthShell } from "@/components/AuthShell";
import { resetAdminPasswordFn } from "@/lib/auth.functions";
import { safeReturnPath } from "@/lib/safe-redirect";

export const Route = createFileRoute("/admin_/reset-password")({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search["token"] === "string" ? search["token"] : "",
    redirect: safeReturnPath(search["redirect"], "/admin/dashboard"),
  }),
  component: AdminResetPasswordPage,
});

function AdminResetPasswordPage() {
  const { token, redirect } = Route.useSearch();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (
      password.length < 8 ||
      !/[A-Z]/.test(password) ||
      !/[a-z]/.test(password) ||
      !/[0-9]/.test(password)
    )
      return setError(
        "Use at least 8 characters with uppercase, lowercase and a number.",
      );
    if (password !== confirm) return setError("Passwords do not match.");
    setBusy(true);
    const result = await resetAdminPasswordFn({ data: { token, password } });
    setBusy(false);
    if (!result.ok) return setError(result.message);
    void navigate({
      to: "/admin",
      search: { reset: "success", redirect },
      replace: true,
    });
  }
  return (
    <AuthShell
      admin
      eyebrow="Administrator recovery"
      title="Choose a new admin password."
      description="This one-time link expires after 30 minutes."
    >
      <div>
        <h2 className="font-[family-name:var(--font-display)] text-3xl font-semibold">
          Reset admin password
        </h2>
        {error ? (
          <p
            role="alert"
            className="mt-4 rounded-xl bg-destructive/5 p-3 text-sm text-destructive"
          >
            {error}
          </p>
        ) : null}
        <form onSubmit={submit} className="mt-6 space-y-4">
          <input
            required
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="New password"
            className="h-12 w-full rounded-2xl border border-border px-4"
          />
          <input
            required
            type="password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            placeholder="Confirm new password"
            className="h-12 w-full rounded-2xl border border-border px-4"
          />
          <button
            disabled={busy || !token}
            className="bg-gold-gradient h-12 w-full rounded-2xl font-bold text-gold-foreground disabled:opacity-60"
          >
            {busy ? "Updating…" : "Update admin password"}
          </button>
        </form>
      </div>
    </AuthShell>
  );
}
