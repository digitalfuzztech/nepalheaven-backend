import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Check, CreditCard, LockKeyhole } from "lucide-react";
import { useState, type FormEvent } from "react";
import {
  getMyCheckoutIntentFn,
  payCheckoutWithDevelopmentMockFn,
  selectCheckoutPaymentOptionFn,
} from "@/lib/booking.functions";

export const Route = createFileRoute("/booking/payment")({
  validateSearch: (search: Record<string, unknown>) => ({
    checkout: typeof search["checkout"] === "string" ? search["checkout"] : "",
  }),
  loaderDeps: ({ search }) => ({ checkout: search.checkout }),
  loader: ({ deps }) =>
    getMyCheckoutIntentFn({ data: { reference: deps.checkout } }),
  component: PaymentChoicePage,
});

function PaymentChoicePage() {
  const result = Route.useLoaderData();
  const navigate = useNavigate();
  const [checkout, setCheckout] = useState(result.ok ? result.checkout : null);
  const [card, setCard] = useState({
    cardholderName: "",
    cardNumber: "",
    expiry: "",
    cvv: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (!result.ok || !checkout)
    return (
      <section className="container-lux py-24 text-center">
        <h1 className="text-4xl font-semibold">Checkout unavailable</h1>
        <p className="mx-auto mt-4 max-w-lg text-muted-foreground">
          {result.ok ? "This checkout is unavailable." : result.message}
        </p>
        <Link
          to="/packages"
          className="mt-7 inline-flex rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground"
        >
          Explore trips
        </Link>
      </section>
    );

  async function choose(option: "minimum" | "full") {
    if (!checkout) return;
    setBusy(true);
    setError("");
    try {
      const update = await selectCheckoutPaymentOptionFn({
        data: { reference: checkout.reference, option },
      });
      if (!update.ok) setError(update.message);
      else setCheckout(update.checkout);
    } finally {
      setBusy(false);
    }
  }

  async function pay(event: FormEvent) {
    event.preventDefault();
    if (!checkout) return;
    setBusy(true);
    setError("");
    try {
      const payment = await payCheckoutWithDevelopmentMockFn({
        data: { reference: checkout.reference, ...card },
      });
      if (!payment.ok) return setError(payment.message);
      setCard({ cardholderName: "", cardNumber: "", expiry: "", cvv: "" });
      void navigate({
        to: "/booking/success",
        search: { reference: payment.booking.reference },
      });
    } catch {
      setError(
        "The development payment could not be completed. No booking was created.",
      );
    } finally {
      setBusy(false);
    }
  }

  const choices = [
    {
      id: "minimum" as const,
      title: "Advance payment",
      description: `${checkout.minimumDepositPercentage}% of grand total`,
      amount: checkout.minimumDepositAmount,
    },
    {
      id: "full" as const,
      title: "Full payment",
      description: "100% of grand total",
      amount: checkout.grandTotal,
    },
  ];
  return (
    <section className="container-lux py-14 lg:py-24">
      <div className="mx-auto max-w-5xl">
        <div className="mb-10">
          <p className="eyebrow text-gold">Development payment</p>
          <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl font-semibold text-primary">
            Choose your payment option.
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This local-only mock card provider exercises the verified payment
            lifecycle. No real card is charged.
          </p>
        </div>
        <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
          <form
            onSubmit={pay}
            className="rounded-3xl border border-border bg-card p-7"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              {choices.map((choice) => (
                <button
                  key={choice.id}
                  type="button"
                  disabled={busy}
                  onClick={() => void choose(choice.id)}
                  className={`rounded-2xl border p-5 text-left ${checkout.selectedPaymentOption === choice.id ? "border-gold bg-accent" : "border-border hover:border-gold/60"}`}
                >
                  <div className="flex justify-between">
                    <CreditCard className="h-5 w-5 text-gold" />
                    {checkout.selectedPaymentOption === choice.id ? (
                      <Check className="h-5 w-5 text-forest" />
                    ) : null}
                  </div>
                  <span className="mt-5 block font-semibold">
                    {choice.title}
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {choice.description}
                  </span>
                  <strong className="mt-4 block text-2xl">
                    {money(choice.amount, checkout.currency)}
                  </strong>
                </button>
              ))}
            </div>
            <div className="mt-7 rounded-2xl border border-gold/25 bg-gold/5 p-5">
              <div className="flex items-center gap-2 font-semibold">
                <LockKeyhole className="h-4 w-4 text-gold" /> Development-only
                mock card
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Use any reasonably formatted dummy card. Use 4000 0000 0000 0002
                to test a decline. Card number, expiry and CVV are never stored
                or logged.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <CardField
                  label="Cardholder name"
                  value={card.cardholderName}
                  onChange={(value) =>
                    setCard({ ...card, cardholderName: value })
                  }
                />
                <CardField
                  label="Card number"
                  value={card.cardNumber}
                  onChange={(value) => setCard({ ...card, cardNumber: value })}
                  inputMode="numeric"
                />
                <CardField
                  label="Expiry (MM/YY)"
                  value={card.expiry}
                  onChange={(value) => setCard({ ...card, expiry: value })}
                />
                <CardField
                  label="CVV"
                  value={card.cvv}
                  onChange={(value) => setCard({ ...card, cvv: value })}
                  inputMode="numeric"
                />
              </div>
            </div>
            {error ? (
              <p role="alert" className="mt-5 text-sm text-destructive">
                {error}
              </p>
            ) : null}
            {busy ? (
              <div
                role="status"
                className="mt-5 rounded-2xl border border-gold/25 bg-gold/5 px-4 py-3"
              >
                <p className="text-sm font-semibold text-primary">
                  Processing Payment
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Your payment is being securely verified. Please don&apos;t
                  close this page.
                </p>
              </div>
            ) : null}
            <button
              disabled={busy}
              className="mt-7 h-13 w-full rounded-2xl bg-primary px-6 text-sm font-bold text-primary-foreground disabled:opacity-60"
            >
              {busy
                ? "Processing Payment..."
                : `Pay ${money(checkout.selectedPaymentAmount, checkout.currency)}`}
            </button>
          </form>
          <aside className="h-fit rounded-3xl border border-border bg-card p-7 lg:sticky lg:top-28">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
              Checkout summary
            </p>
            <h2 className="mt-4 text-xl font-semibold">
              {checkout.packageTitle}
            </h2>
            <div className="mt-6 space-y-3 text-sm">
              <Summary label="Departure" value={date(checkout.departureDate)} />
              <Summary label="Travellers" value={String(checkout.travellers)} />
              <Summary label="Tier" value={checkout.tierName} />
              <Summary
                label="Subtotal"
                value={money(checkout.subtotal, checkout.currency)}
              />
              <Summary
                label={`VAT (${checkout.vatPercentage}%)`}
                value={money(checkout.vatAmount, checkout.currency)}
              />
            </div>
            <div className="mt-6 space-y-3 border-t border-border pt-5">
              <Summary
                label="Grand Total"
                value={money(checkout.grandTotal, checkout.currency)}
                strong
              />
              <Summary
                label="Payable Amount Now"
                value={money(checkout.selectedPaymentAmount, checkout.currency)}
                strong
              />
              <Summary
                label="Remaining Amount"
                value={money(checkout.remainingAmount, checkout.currency)}
              />
              <Summary
                label="Due Date"
                value={checkout.dueDate ? date(checkout.dueDate) : "-"}
              />
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

function CardField({
  label,
  value,
  onChange,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  inputMode?: "numeric";
}) {
  return (
    <label>
      <span className="mb-1 block text-xs font-semibold">{label}</span>
      <input
        required
        value={value}
        inputMode={inputMode}
        autoComplete="off"
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm"
      />
    </label>
  );
}
function Summary({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className={strong ? "font-bold" : "font-semibold"}>{value}</span>
    </div>
  );
}
function money(value: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(
    value,
  );
}
function date(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00.000Z`));
}
