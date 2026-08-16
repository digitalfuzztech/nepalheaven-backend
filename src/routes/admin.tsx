import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { AuthShell } from "@/components/AuthShell";
import { AuthForm } from "@/components/AuthForm";
import { useAuth } from "@/lib/auth";
import { safeReturnPath } from "@/lib/safe-redirect";

function AdminLoginPage() {
  const navigate = useNavigate();
  const { user, ready } = useAuth();
  const { redirect, reset } = Route.useSearch();

  useEffect(() => {
    if (!ready) return;

    if (user?.role === "admin") {
      window.location.assign(safeReturnPath(redirect, "/admin/dashboard"));
      return;
    }

    if (user?.role === "customer") {
      void navigate({ to: "/account", replace: true });
    }
  }, [ready, user, navigate, redirect]);

  if (!ready || user) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <div className="text-sm text-muted-foreground">
          Checking your session...
        </div>
      </div>
    );
  }

  return (
    <AuthShell
      admin
      eyebrow="Secure administration"
      title="Run Nepal Heaven from one place."
      description="Access the Nepal Heaven administration workspace. Customer accounts cannot access this area."
    >
      {reset === "success" ? (
        <p className="mb-4 rounded-xl bg-forest/10 p-3 text-sm">
          Password reset complete. Sign in with your new password.
        </p>
      ) : null}
      <AuthForm
        role="admin"
        title="Admin sign in"
        subtitle="Use your Nepal Heaven administrator credentials."
        {...(redirect ? { returnTo: redirect } : {})}
      />
    </AuthShell>
  );
}

export const Route = createFileRoute("/admin")({
  validateSearch: (search: Record<string, unknown>) => ({
    ...(typeof search["redirect"] === "string"
      ? { redirect: search["redirect"] }
      : {}),
    ...(search["reset"] === "success" ? { reset: "success" } : {}),
  }),
  component: AdminLoginPage,
});
