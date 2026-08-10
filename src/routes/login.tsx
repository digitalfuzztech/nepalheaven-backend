import { createFileRoute } from "@tanstack/react-router";
import { AuthShell } from "@/components/AuthShell";
import { AuthForm } from "@/components/AuthForm";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } =>
    typeof search["redirect"] === "string" ? { redirect: search["redirect"] } : {},
  component: LoginPage,
});

function LoginPage() {
  const { redirect } = Route.useSearch();
  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Your next Nepal journey starts here."
      description="Sign in to manage your trips, compare journeys, save favourites and keep every booking in one place."
    >
      <AuthForm role="customer" title="Welcome back" subtitle="Sign in to your Nepal Heaven traveller account." {...(redirect ? { returnTo: redirect } : {})} />
    </AuthShell>
  );
}
