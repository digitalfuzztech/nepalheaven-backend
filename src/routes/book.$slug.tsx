import {
  createFileRoute,
  Link,
  notFound,
  useNavigate,
} from "@tanstack/react-router";
import { CreditCard, FileText, LockKeyhole } from "lucide-react";
import { useState, type FormEvent } from "react";
import { getPackageBySlugFn } from "@/lib/content.functions";
import type { Package } from "@/lib/content.types";
import { useAuth } from "@/lib/auth";
import { createCheckoutIntentFn } from "@/lib/booking.functions";
import { countryName } from "@/lib/countries";

export const Route = createFileRoute("/book/$slug")({
  loader: async ({ params }) => {
    const pkg = await getPackageBySlugFn({ data: { slug: params.slug } });
    if (!pkg) throw notFound();
    return { pkg };
  },
  component: CheckoutPage,
});

type CheckoutResult = Extract<
  Awaited<ReturnType<typeof createCheckoutIntentFn>>,
  { ok: true }
>["checkout"];

function CheckoutPage() {
  const { pkg } = Route.useLoaderData();
  const { user, ready } = useAuth();
  const navigate = useNavigate();
  const [travellers, setTravellers] = useState(2);
  const [tier, setTier] = useState(
    pkg.tiers[1]?.name || pkg.tiers[0]?.name || "",
  );
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");
  const [documentType, setDocumentType] = useState<"passport" | "national_id">(
    "passport",
  );
  const [identityDocument, setIdentityDocument] = useState<File | null>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [checkout, setCheckout] = useState<CheckoutResult | null>(null);
  const [error, setError] = useState("");
  const [preparing, setPreparing] = useState(false);

  if (!ready) return <div className="min-h-[70vh]" />;
  if (!user || user.role !== "customer") {
    return (
      <section className="container-lux py-24 text-center">
        <h1 className="font-[family-name:var(--font-display)] text-4xl font-semibold">
          Sign in before checkout
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-muted-foreground">
          A traveller account is required to prepare checkout securely.
        </p>
        <Link
          to="/login"
          search={{ redirect: `/book/${pkg.slug}` }}
          className="bg-gold-gradient mt-7 inline-flex rounded-full px-6 py-3 text-sm font-bold text-gold-foreground"
        >
          Sign in
        </Link>
      </section>
    );
  }

  const selectedTier =
    pkg.tiers.find((item) => item.name === tier) || pkg.tiers[0];
  const estimate = (selectedTier?.price || pkg.price) * travellers;

  async function prepareCheckout(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!date) return setError("Please choose your preferred departure date.");
    setPreparing(true);
    try {
      const data = new FormData();
      data.set("packageSlug", pkg.slug);
      data.set("tierName", tier);
      data.set("departureDate", date);
      data.set("travellers", String(travellers));
      data.set("notes", notes);
      if (identityDocument) {
        data.set("documentType", documentType);
        data.set("identityDocument", identityDocument);
      }
      const result = await createCheckoutIntentFn({
        data,
      });
      if (!result.ok) {
        if (
          result.code === "AUTH_REQUIRED" ||
          result.code === "CUSTOMER_REQUIRED"
        ) {
          window.location.assign(
            `/login?redirect=${encodeURIComponent(`/book/${pkg.slug}`)}`,
          );
          return;
        }
        setError(result.message);
        return;
      }
      setCheckout(result.checkout);
      setStep(2);
    } catch (checkoutError) {
      console.error("Checkout preparation failed", checkoutError);
      setError("Please review your checkout details and try again.");
    } finally {
      setPreparing(false);
    }
  }

  return (
    <section className="container-lux py-14 lg:py-24">
      <div className="mx-auto max-w-5xl">
        <div className="mb-10">
          <p className="eyebrow text-gold">Prepare your journey</p>
          <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl font-semibold text-primary">
            {pkg.title}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {pkg.days} days · {pkg.destination}
          </p>
        </div>
        <div className="mb-8 grid grid-cols-2 rounded-2xl bg-accent p-1 text-sm font-semibold">
          <div
            className={`rounded-xl px-4 py-3 text-center ${step === 1 ? "bg-card shadow-sm" : "text-muted-foreground"}`}
          >
            1. Traveller details
          </div>
          <div
            className={`rounded-xl px-4 py-3 text-center ${step === 2 ? "bg-card shadow-sm" : "text-muted-foreground"}`}
          >
            2. Review & payment choice
          </div>
        </div>

        {step === 1 ? (
          <form
            onSubmit={prepareCheckout}
            className="grid gap-8 lg:grid-cols-[1fr_20rem]"
          >
            <div className="rounded-3xl border border-border bg-card p-7">
              <h2 className="text-2xl font-semibold">Traveller information</h2>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <ProfileField label="Full name" value={user.name} />
                <ProfileField label="Email" value={user.email} />
                <ProfileField
                  label="Contact number"
                  value={user.phone || "Profile incomplete"}
                />
                <ProfileField
                  label="Nationality"
                  value={countryName(user.nationality) || "Profile incomplete"}
                />
                <ProfileField
                  label="Date of birth"
                  value={user.dateOfBirth || "Profile incomplete"}
                />
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold">
                    Departure date
                  </span>
                  <input
                    required
                    type="date"
                    value={date}
                    onChange={(event) => setDate(event.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    className="h-12 w-full rounded-2xl border border-border bg-background px-4 text-sm outline-none focus:border-gold"
                  />
                </label>
              </div>
              <label className="mt-4 block">
                <span className="mb-2 block text-sm font-semibold">
                  Notes or special requests
                </span>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={4}
                  className="w-full rounded-2xl border border-border bg-background p-4 text-sm outline-none focus:border-gold"
                  placeholder="Dietary needs, room preferences, celebrations..."
                />
              </label>
              <fieldset className="mt-5 rounded-2xl border border-border bg-background p-5">
                <legend className="px-2 text-sm font-semibold">
                  Passport / ID (optional)
                </legend>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  You can skip this for now and upload your passport or ID later
                  from your booking details in the customer dashboard.
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-[10rem_1fr]">
                  <select
                    value={documentType}
                    onChange={(event) =>
                      setDocumentType(
                        event.target.value as "passport" | "national_id",
                      )
                    }
                    className="h-12 rounded-xl border border-border bg-card px-3 text-sm"
                  >
                    <option value="passport">Passport</option>
                    <option value="national_id">National ID</option>
                  </select>
                  <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-dashed border-border bg-card px-4 text-sm hover:border-gold">
                    <FileText className="h-4 w-4 text-gold" />
                    <span className="min-w-0 truncate">
                      {identityDocument?.name || "Choose PDF or image"}
                    </span>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
                      onChange={(event) =>
                        setIdentityDocument(event.target.files?.[0] ?? null)
                      }
                      className="sr-only"
                    />
                  </label>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  PDF, JPEG, PNG or WEBP · maximum 10 MB
                </p>
              </fieldset>
              {error ? (
                <p className="mt-4 text-sm text-destructive">{error}</p>
              ) : null}
              <button
                disabled={preparing}
                className="bg-gold-gradient mt-6 w-full rounded-2xl px-6 py-4 text-sm font-bold text-gold-foreground disabled:opacity-60"
              >
                {preparing
                  ? "Preparing secure checkout…"
                  : "Continue to review"}
              </button>
            </div>
            <PackageSummary
              pkg={pkg}
              travellers={travellers}
              setTravellers={setTravellers}
              tier={tier}
              setTier={setTier}
              total={estimate}
            />
          </form>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
            <div className="rounded-3xl border border-border bg-card p-7">
              <h2 className="text-2xl font-semibold">Review your checkout</h2>
              <div className="mt-6 space-y-3 text-sm">
                <Review label="Traveller" value={user.name} />
                <Review label="Email" value={user.email} />
                <Review
                  label="Contact number"
                  value={user.phone || "Not provided"}
                />
                <Review
                  label="Nationality"
                  value={countryName(user.nationality) || "Not provided"}
                />
                <Review
                  label="Date of birth"
                  value={user.dateOfBirth || "Not provided"}
                />
                <Review label="Departure" value={date} />
                <Review label="Travellers" value={String(travellers)} />
                <Review label="Package tier" value={tier} />
                <Review
                  label="Notes"
                  value={notes.trim() || "No notes provided"}
                />
                <Review
                  label="Passport / ID"
                  value={
                    identityDocument
                      ? `${documentType === "passport" ? "Passport" : "National ID"}: ${identityDocument.name}`
                      : "Not uploaded"
                  }
                />
              </div>
              {checkout ? (
                <div className="mt-7 rounded-2xl bg-accent p-5">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    Server-calculated pricing
                  </p>
                  <div className="mt-4 space-y-1">
                    <Review
                      label="Package subtotal"
                      value={formatMoney(checkout.subtotal, checkout.currency)}
                    />
                    <Review
                      label={`VAT (${checkout.vatPercentage}%)`}
                      value={formatMoney(checkout.vatAmount, checkout.currency)}
                    />
                    <Review
                      label="Grand total"
                      value={formatMoney(
                        checkout.grandTotal,
                        checkout.currency,
                      )}
                    />
                    <Review
                      label={`Minimum advance (${checkout.minimumDepositPercentage}%)`}
                      value={formatMoney(
                        checkout.minimumDepositAmount,
                        checkout.currency,
                      )}
                    />
                  </div>
                </div>
              ) : null}
              <div className="mt-5 rounded-2xl border border-gold/25 bg-gold/5 p-5 text-sm leading-relaxed">
                This is checkout preparation only. A booking will exist only
                after a payment provider verifies at least the required minimum
                advance.
              </div>
              {error ? (
                <p className="mt-4 text-sm text-destructive">{error}</p>
              ) : null}
              <button
                disabled={!checkout}
                onClick={() =>
                  checkout &&
                  void navigate({
                    to: "/booking/payment",
                    search: { checkout: checkout.reference },
                  })
                }
                className="bg-gold-gradient mt-6 flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-4 text-sm font-bold text-gold-foreground disabled:opacity-60"
              >
                <CreditCard className="h-4 w-4" /> Continue to payment options
              </button>
              <button
                onClick={() => {
                  setCheckout(null);
                  setStep(1);
                }}
                className="mt-3 w-full rounded-2xl border border-border px-6 py-3 text-sm font-semibold"
              >
                Back / Edit Booking Details
              </button>
            </div>
            <ReadOnlyPackageSummary
              pkg={pkg}
              travellers={travellers}
              tier={tier}
              total={checkout?.grandTotal ?? estimate}
            />
          </div>
        )}
      </div>
    </section>
  );
}

function ReadOnlyPackageSummary({
  pkg,
  travellers,
  tier,
  total,
}: {
  pkg: Package;
  travellers: number;
  tier: string;
  total: number;
}) {
  return (
    <aside className="h-fit rounded-3xl border border-border bg-card p-7 lg:sticky lg:top-28">
      <img
        src={pkg.image}
        alt=""
        className="aspect-[16/10] w-full rounded-2xl object-cover"
      />
      <h2 className="mt-5 text-xl font-semibold">{pkg.title}</h2>
      <div className="mt-5 space-y-3 text-sm">
        <Review label="Travellers" value={String(travellers)} />
        <Review label="Package tier" value={tier} />
      </div>
      <div className="mt-6 border-t border-border pt-5">
        <div className="flex justify-between text-sm">
          <span>Server-calculated total</span>
          <strong>{formatMoney(total, selectedCurrency(pkg, tier))}</strong>
        </div>
      </div>
      <div className="mt-5 flex items-center gap-2 text-xs text-muted-foreground">
        <LockKeyhole className="h-4 w-4 text-forest" /> Review only
      </div>
    </aside>
  );
}

function ProfileField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-accent p-4">
      <span className="block text-xs font-bold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <strong className="mt-1 block text-sm">{value}</strong>
    </div>
  );
}

function Review({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border py-3">
      <span className="text-muted-foreground">{label}</span>
      <strong className="text-right">{value}</strong>
    </div>
  );
}

function PackageSummary({
  pkg,
  travellers,
  setTravellers,
  tier,
  setTier,
  total,
}: {
  pkg: Package;
  travellers: number;
  setTravellers: (value: number) => void;
  tier: string;
  setTier: (value: string) => void;
  total: number;
}) {
  return (
    <aside className="h-fit rounded-3xl border border-border bg-card p-7 lg:sticky lg:top-28">
      <img
        src={pkg.image}
        alt=""
        className="aspect-[16/10] w-full rounded-2xl object-cover"
      />
      <h2 className="mt-5 text-xl font-semibold">{pkg.title}</h2>
      <label className="mt-5 block text-sm font-semibold">
        Travellers
        <select
          value={travellers}
          onChange={(event) => setTravellers(Number(event.target.value))}
          className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
        >
          {[1, 2, 3, 4, 5, 6, 8, 10, 12].map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
      </label>
      <label className="mt-4 block text-sm font-semibold">
        Package tier
        <select
          value={tier}
          onChange={(event) => setTier(event.target.value)}
          className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
        >
          {pkg.tiers.map((item) => (
            <option key={item.name}>{item.name}</option>
          ))}
        </select>
      </label>
      <div className="mt-6 border-t border-border pt-5">
        <div className="flex justify-between text-sm">
          <span>{"Estimated / quoted total"}</span>
          <strong>{formatMoney(total, selectedCurrency(pkg, tier))}</strong>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          VAT and the required advance are calculated authoritatively by the
          server.
        </p>
      </div>
      <div className="mt-5 flex items-center gap-2 text-xs text-muted-foreground">
        <LockKeyhole className="h-4 w-4 text-forest" /> Secure checkout
        preparation
      </div>
    </aside>
  );
}

function selectedCurrency(pkg: Package, tierName: string) {
  return (
    pkg.tiers.find((tier) => tier.name === tierName)?.currency || pkg.currency
  );
}

function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(
    value,
  );
}
