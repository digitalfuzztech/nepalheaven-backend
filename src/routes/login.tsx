import { createFileRoute } from "@tanstack/react-router";
import { AuthShell } from "@/components/AuthShell";
import { AuthForm } from "@/components/AuthForm";

export const Route = createFileRoute("/login")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { redirect?: string; verified?: string } => ({
    ...(typeof search["redirect"] === "string"
      ? { redirect: search["redirect"] }
      : {}),
    ...(search["verified"] === "1" ? { verified: "1" } : {}),
  }),
  component: LoginPage,
});

function LoginPage() {
  const { redirect, verified } = Route.useSearch();
  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Your next Nepal journey starts here."
      description="Sign in to manage your trips, compare journeys, save favourites and keep every booking in one place."
    >
      {verified ? (
        <p className="mb-4 rounded-xl bg-forest/10 p-3 text-sm">
          Your email is verified. You can now sign in.
        </p>
      ) : null}
      <AuthForm
        role="customer"
        title="Welcome back"
        subtitle="Sign in to your Nepal Heaven traveller account."
        {...(redirect ? { returnTo: redirect } : {})}
      />
    </AuthShell>
  );
}
