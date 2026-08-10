import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { AuthShell } from "@/components/AuthShell";
import { AuthForm } from "@/components/AuthForm";
import { useAuth } from "@/lib/auth";

function AdminLoginPage() {
  const navigate = useNavigate();
  const { user, ready } = useAuth();

  useEffect(() => {
    if (!ready) return;

    if (user?.role === "admin") {
      void navigate({ to: "/admin/dashboard", replace: true });
      return;
    }

    if (user?.role === "customer") {
      void navigate({ to: "/account", replace: true });
    }
  }, [ready, user, navigate]);

  if (!ready || user) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <div className="text-sm text-muted-foreground">Checking your session...</div>
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
      <AuthForm role="admin" title="Admin sign in" subtitle="Use your Nepal Heaven administrator credentials." />
    </AuthShell>
  );
}

export const Route = createFileRoute("/admin")({
  component: AdminLoginPage,
});
