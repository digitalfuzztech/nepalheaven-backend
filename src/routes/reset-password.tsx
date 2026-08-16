import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { AuthShell } from "@/components/AuthShell";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/reset-password")({
  validateSearch: (search: Record<string, unknown>) => ({ token: typeof search["token"] === "string" ? search["token"] : "" }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const { token } = Route.useSearch();
  const { resetPassword } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!token) return setError("This reset link is missing its token.");
    if (password.length < 8 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) return setError("Use at least 8 characters with uppercase, lowercase and a number.");
    if (password !== confirm) return setError("Passwords do not match.");
    setBusy(true);
    const result = await resetPassword(token, password);
    setBusy(false);
    if (!result.ok) return setError(result.message);
    setMessage(result.message);
    setTimeout(() => void navigate({ to: "/login" }), 900);
  }

  return (
    <AuthShell eyebrow="Account recovery" title="Choose a new password." description="Set a new password and return to your traveller account.">
      <div>
        <p className="eyebrow text-gold">New password</p>
        <h2 className="mt-3 font-[family-name:var(--font-display)] text-4xl font-semibold text-primary">Reset password</h2>
        <p className="mt-3 text-sm text-muted-foreground">Your reset link is valid for 30 minutes.</p>
        {error ? <div className="mt-5 rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</div> : null}
        {message ? <div className="mt-5 rounded-2xl border border-forest/20 bg-forest/5 px-4 py-3 text-sm text-foreground">{message}</div> : null}
        <form onSubmit={submit} className="mt-7 space-y-4">
          <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="New password" className="h-12 w-full rounded-2xl border border-border bg-card px-4 text-sm outline-none focus:border-gold" />
          <input required type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Confirm new password" className="h-12 w-full rounded-2xl border border-border bg-card px-4 text-sm outline-none focus:border-gold" />
          <button disabled={busy} className="bg-gold-gradient h-12 w-full rounded-2xl text-sm font-bold text-gold-foreground disabled:opacity-60">{busy ? "Updating…" : "Update password"}</button>
        </form>
        <p className="mt-6 text-center text-sm"><Link to="/login" className="font-bold text-primary hover:text-gold">Back to login</Link></p>
      </div>
    </AuthShell>
  );
}
