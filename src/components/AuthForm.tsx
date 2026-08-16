import { useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { Eye, EyeOff, LoaderCircle, LockKeyhole, Mail } from "lucide-react";
import { useAuth, type UserRole } from "@/lib/auth";
import { safeReturnPath } from "@/lib/safe-redirect";

export function AuthForm({
  role,
  title,
  subtitle,
  returnTo,
}: {
  role: UserRole;
  title: string;
  subtitle: string;
  returnTo?: string;
}) {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    await new Promise((resolve) => setTimeout(resolve, 250));
    const result = await login(email, password, role);
    setBusy(false);
    if (!result.ok) {
      if (result.requiresVerification) {
        window.sessionStorage.setItem(
          "nepalheaven_verification_email",
          email.trim().toLowerCase(),
        );
        const target = new URL(
          result.verificationPath || "/verify-email",
          window.location.origin,
        );
        const [local, domain] = email.trim().toLowerCase().split("@");
        target.searchParams.set(
          "address",
          `${local?.slice(0, 2) || ""}***@${domain || ""}`,
        );
        target.searchParams.set(
          "notice",
          result.verificationSent
            ? "unverified_login_sent"
            : "unverified_login_cooldown",
        );
        window.location.assign(`${target.pathname}${target.search}`);
      } else setError(result.message);
      return;
    }
    // Perform a clean navigation after the server creates the HttpOnly session cookie.
    window.location.assign(
      safeReturnPath(
        returnTo,
        role === "admin" ? "/admin/dashboard" : "/account",
      ),
    );
  }

  return (
    <div>
      <div className="mb-8">
        <p className="eyebrow text-gold">
          {role === "admin" ? "Administrator access" : "Traveller account"}
        </p>
        <h2 className="mt-3 font-[family-name:var(--font-display)] text-4xl font-semibold text-primary">
          {title}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {subtitle}
        </p>
      </div>

      {error ? (
        <div
          role="alert"
          className="mb-5 rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          {error}
        </div>
      ) : null}

      <form onSubmit={submit} className="space-y-5">
        <label className="block">
          <span className="mb-2 block text-sm font-semibold">
            Email address
          </span>
          <span className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 focus-within:border-gold">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <input
              required
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 w-full bg-transparent text-sm outline-none"
              placeholder={
                role === "admin" ? "admin@nepalheaven.com" : "you@example.com"
              }
            />
          </span>
        </label>

        <label className="block">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-semibold">Password</span>
            {role === "customer" ? (
              <Link
                to="/forgot-password"
                className="text-xs font-semibold text-primary hover:text-gold"
              >
                Forgot password?
              </Link>
            ) : (
              <Link
                to="/admin/forgot-password"
                search={{ redirect: returnTo || "/admin/dashboard" }}
                className="text-xs font-semibold text-primary hover:text-gold"
              >
                Forgot password?
              </Link>
            )}
          </div>
          <span className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 focus-within:border-gold">
            <LockKeyhole className="h-4 w-4 text-muted-foreground" />
            <input
              required
              type={show ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 w-full bg-transparent text-sm outline-none"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              aria-label={show ? "Hide password" : "Show password"}
              className="text-muted-foreground hover:text-foreground"
            >
              {show ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </span>
        </label>

        <button
          disabled={busy}
          className="bg-gold-gradient flex h-12 w-full items-center justify-center gap-2 rounded-2xl px-6 text-sm font-bold text-gold-foreground transition-transform hover:scale-[1.01] disabled:opacity-60"
        >
          {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
          {role === "admin" ? "Sign in to admin" : "Sign in"}
        </button>
      </form>

      {role === "customer" ? (
        <p className="mt-7 text-center text-sm text-muted-foreground">
          New to Nepal Heaven?{" "}
          <Link
            to="/registration"
            className="font-bold text-primary hover:text-gold"
          >
            Create an account
          </Link>
        </p>
      ) : (
        <p className="mt-7 text-center text-xs text-muted-foreground">
          Customer accounts use{" "}
          <Link to="/login" className="font-semibold text-primary">
            customer login
          </Link>
          .
        </p>
      )}
    </div>
  );
}
