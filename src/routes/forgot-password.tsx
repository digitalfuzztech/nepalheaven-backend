import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { AuthShell } from "@/components/AuthShell";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState("");
  const [outcome, setOutcome] = useState<{
    status: "not_found" | "verification_required" | "sent" | "other";
    message: string;
    verificationPath?: string;
  } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setOutcome(null);
    setBusy(true);
    const result = await requestPasswordReset(email);
    setBusy(false);
    if (!result.ok) return setError(result.message);
    let verificationPath = result.verificationPath;
    if (result.status === "verification_required") {
      window.sessionStorage.setItem(
        "nepalheaven_verification_email",
        email.trim().toLowerCase(),
      );
      const target = new URL(
        verificationPath || "/verify-email",
        window.location.origin,
      );
      const [local, domain] = email.trim().toLowerCase().split("@");
      target.searchParams.set(
        "address",
        `${local?.slice(0, 2) || ""}***@${domain || ""}`,
      );
      target.searchParams.set(
        "notice",
        result.sent ? "unverified_login_sent" : "unverified_login_cooldown",
      );
      verificationPath = `${target.pathname}${target.search}`;
    }
    setOutcome({
      status: result.status || "other",
      message: result.message,
      ...(verificationPath ? { verificationPath } : {}),
    });
  }

  return (
    <AuthShell
      eyebrow="Account recovery"
      title="Get back to your journeys."
      description="Enter your account email and we'll prepare the next step for resetting your password."
    >
      <div>
        <p className="eyebrow text-gold">Forgot password</p>
        <h2 className="mt-3 font-[family-name:var(--font-display)] text-4xl font-semibold text-primary">
          Reset your password
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Enter your traveller email. If it matches an eligible account, Nepal
          Heaven will send a secure one-time reset link.
        </p>
        {error ? (
          <div
            role="alert"
            className="mt-5 rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive"
          >
            {error}
          </div>
        ) : null}
        {outcome ? (
          <div className="mt-7 rounded-2xl border border-forest/20 bg-forest/5 p-5 text-sm leading-relaxed">
            <p>{outcome.message}</p>
            {outcome.status === "not_found" ? (
              <>
                <p className="mt-2">
                  Please check the email address or create a new Nepal Heaven
                  account.
                </p>
                <Link
                  to="/registration"
                  className="mt-4 inline-flex rounded-full bg-primary px-5 py-2 font-bold text-primary-foreground"
                >
                  Create Account
                </Link>
              </>
            ) : null}
            {outcome.status === "verification_required" ? (
              <a
                href={outcome.verificationPath || "/verify-email"}
                className="mt-4 inline-flex rounded-full bg-primary px-5 py-2 font-bold text-primary-foreground"
              >
                Verify Email
              </a>
            ) : null}
          </div>
        ) : (
          <form onSubmit={submit} className="mt-7 space-y-4">
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              className="h-12 w-full rounded-2xl border border-border bg-card px-4 text-sm outline-none focus:border-gold"
            />
            <button
              disabled={busy}
              className="bg-gold-gradient h-12 w-full rounded-2xl text-sm font-bold text-gold-foreground disabled:opacity-60"
            >
              {busy ? "Preparing…" : "Prepare reset"}
            </button>
          </form>
        )}
        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link to="/login" className="font-bold text-primary hover:text-gold">
            ← Back to sign in
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
