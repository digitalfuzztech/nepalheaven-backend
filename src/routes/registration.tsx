import { createFileRoute, Link } from "@tanstack/react-router";
import { LoaderCircle } from "lucide-react";
import { useState, type FormEvent } from "react";
import { AuthShell } from "@/components/AuthShell";
import { countryOptions } from "@/lib/countries";
import { registerCustomerFn } from "@/lib/registration.functions";

export const Route = createFileRoute("/registration")({
  loader: () => countryOptions(),
  component: RegistrationPage,
});

function RegistrationPage() {
  const nationalities = Route.useLoaderData();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    nationality: "",
    dateOfBirth: "",
    password: "",
    confirm: "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function update(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (
      form.password.length < 8 ||
      !/[A-Z]/.test(form.password) ||
      !/[a-z]/.test(form.password) ||
      !/[0-9]/.test(form.password)
    )
      return setError(
        "Password must be at least 8 characters and include uppercase, lowercase and a number.",
      );
    if (form.password !== form.confirm)
      return setError("Passwords do not match.");
    setBusy(true);
    try {
      const result = await registerCustomerFn({
        data: {
          name: form.name,
          email: form.email,
          phone: form.phone,
          nationality: form.nationality,
          dateOfBirth: form.dateOfBirth,
          password: form.password,
        },
      });
      if (!result.ok) return setError(result.message);
      window.sessionStorage.setItem(
        "nepalheaven_verification_email",
        form.email.trim().toLowerCase(),
      );
      const verificationUrl = new URL(
        result.verificationPath,
        window.location.origin,
      );
      const [local, domain] = form.email.trim().toLowerCase().split("@");
      verificationUrl.searchParams.set(
        "address",
        `${local?.slice(0, 2) || ""}***@${domain || ""}`,
      );
      verificationUrl.searchParams.set(
        "notice",
        result.existingPending
          ? result.sent
            ? "pending_registration_sent"
            : "pending_registration_cooldown"
          : result.sent
            ? "sent"
            : "send_failed",
      );
      window.location.assign(
        `${verificationUrl.pathname}${verificationUrl.search}`,
      );
    } catch (registrationError) {
      console.error(registrationError);
      setError("We couldn't create your account right now. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const inputClass =
    "h-12 w-full rounded-2xl border border-border bg-card px-4 text-sm outline-none focus:border-gold";
  return (
    <AuthShell
      eyebrow="Join Nepal Heaven"
      title="Keep your journeys together."
      description="Create your traveller account to save trips, compare packages and manage future bookings."
    >
      <div>
        <p className="eyebrow text-gold">Create account</p>
        <h2 className="mt-3 font-[family-name:var(--font-display)] text-4xl font-semibold text-primary">
          Start exploring
        </h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Your profile details help Nepal Heaven prepare accurate traveller and
          permit information.
        </p>
        {error ? (
          <div
            role="alert"
            className="mt-5 rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive"
          >
            {error}
          </div>
        ) : null}
        <form onSubmit={submit} className="mt-7 space-y-4">
          <input
            required
            value={form.name}
            onChange={(event) => update("name", event.target.value)}
            placeholder="Full name"
            autoComplete="name"
            className={inputClass}
          />
          <input
            required
            type="email"
            value={form.email}
            onChange={(event) => update("email", event.target.value)}
            placeholder="Email address"
            autoComplete="email"
            className={inputClass}
          />
          <input
            required
            value={form.phone}
            onChange={(event) => update("phone", event.target.value)}
            placeholder="Contact number"
            autoComplete="tel"
            className={inputClass}
          />
          <label className="block">
            <span className="mb-2 block text-sm font-semibold">
              Nationality *
            </span>
            <select
              required
              value={form.nationality}
              onChange={(event) => update("nationality", event.target.value)}
              autoComplete="country-name"
              className={inputClass}
            >
              <option value="">Select nationality</option>
              {nationalities.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold">
              Date of birth *
            </span>
            <input
              required
              type="date"
              value={form.dateOfBirth}
              onChange={(event) => update("dateOfBirth", event.target.value)}
              max={new Date().toISOString().slice(0, 10)}
              autoComplete="bday"
              className={inputClass}
            />
          </label>
          <input
            required
            type="password"
            value={form.password}
            onChange={(event) => update("password", event.target.value)}
            placeholder="Password"
            autoComplete="new-password"
            className={inputClass}
          />
          <input
            required
            type="password"
            value={form.confirm}
            onChange={(event) => update("confirm", event.target.value)}
            placeholder="Confirm password"
            autoComplete="new-password"
            className={inputClass}
          />
          <button
            disabled={busy}
            className="bg-gold-gradient flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm font-bold text-gold-foreground disabled:opacity-60"
          >
            {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
            {busy ? "Creating account..." : "Create traveller account"}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already registered?{" "}
          <Link to="/login" className="font-bold text-primary hover:text-gold">
            Sign in
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
