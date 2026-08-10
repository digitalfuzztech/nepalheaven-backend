import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { AuthShell } from "@/components/AuthShell";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/forgot-password")({ component: ForgotPasswordPage });

function ForgotPasswordPage() {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [devToken, setDevToken] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const result = await requestPasswordReset(email);
    setBusy(false);
    if (!result.ok) return setError(result.message);
    setDevToken(result.devResetToken || "");
    setSent(true);
  }

  return (
    <AuthShell eyebrow="Account recovery" title="Get back to your journeys." description="Enter your account email and we'll prepare the next step for resetting your password.">
      <div>
        <p className="eyebrow text-gold">Forgot password</p>
        <h2 className="mt-3 font-[family-name:var(--font-display)] text-4xl font-semibold text-primary">Reset your password</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">Password reset requests are now stored securely in the database. Email delivery will be connected in the next communications phase.</p>
        {error ? <div role="alert" className="mt-5 rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</div> : null}
        {sent ? (
          <div className="mt-7 rounded-2xl border border-forest/20 bg-forest/5 p-5 text-sm leading-relaxed">
            If an account exists for <strong>{email}</strong>, a reset link has been prepared.
            {devToken ? <Link to="/reset-password" search={{ token: devToken }} className="mt-4 block font-bold text-primary hover:text-gold">Continue to reset password →</Link> : null}
          </div>
        ) : (
          <form onSubmit={submit} className="mt-7 space-y-4">
            <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" className="h-12 w-full rounded-2xl border border-border bg-card px-4 text-sm outline-none focus:border-gold" />
            <button disabled={busy} className="bg-gold-gradient h-12 w-full rounded-2xl text-sm font-bold text-gold-foreground disabled:opacity-60">{busy ? "Preparing…" : "Prepare reset"}</button>
          </form>
        )}
        <p className="mt-6 text-center text-sm text-muted-foreground"><Link to="/login" className="font-bold text-primary hover:text-gold">← Back to sign in</Link></p>
      </div>
    </AuthShell>
  );
}
