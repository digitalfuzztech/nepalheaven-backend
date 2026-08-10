import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import { getBookingSummaryFn } from "@/lib/booking.functions";

export const Route = createFileRoute("/booking/success")({
  validateSearch: (search: Record<string, unknown>) => ({
    reference:
      typeof search["reference"] === "string" ? search["reference"] : "",
  }),
  loaderDeps: ({ search }) => ({ reference: search.reference }),
  loader: ({ deps }) =>
    getBookingSummaryFn({ data: { reference: deps.reference } }),
  component: BookingSuccessPage,
});

function BookingSuccessPage() {
  const result = Route.useLoaderData();
  if (!result.ok)
    return (
      <section className="container-lux py-24 text-center">
        <h1 className="text-4xl font-semibold">Booking unavailable</h1>
        <p className="mx-auto mt-4 max-w-lg text-muted-foreground">
          {result.message}
        </p>
        <Link
          to="/account"
          className="mt-7 inline-flex rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground"
        >
          Go to my account
        </Link>
      </section>
    );
  const booking = result.booking;
  return (
    <section className="container-lux flex min-h-[75vh] items-center justify-center py-20">
      <div className="w-full max-w-2xl rounded-[2rem] border border-border bg-card p-8 text-center shadow-[var(--shadow-soft)] sm:p-12">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-forest/10 text-forest">
          <CheckCircle2 className="h-10 w-10" />
        </div>
        <p className="eyebrow mt-8 text-gold">Payment successful</p>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl font-semibold text-primary">
          Booking confirmed
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-muted-foreground">
          Your confirmed booking for <strong>{booking.packageTitle}</strong> has
          reference <strong>{booking.reference}</strong>.
        </p>
        <div className="mt-8 grid gap-4 text-left sm:grid-cols-2">
          <Info
            label="Amount paid"
            value={money(booking.amountPaid, booking.currency)}
          />
          <Info
            label="Payment option"
            value={
              booking.paymentOption === "full"
                ? "Full payment"
                : `Advance (${booking.initialPaymentPercentage}%)`
            }
          />
          <Info label="Payment status" value={title(booking.paymentStatus)} />
          <Info
            label="Remaining balance"
            value={money(booking.remainingBalance, booking.currency)}
          />
          <Info
            label="Due date"
            value={booking.balanceDueDate ? date(booking.balanceDueDate) : "-"}
          />
          <Info label="Booking status" value="Confirmed" />
        </div>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            to="/account/bookings/$reference"
            params={{ reference: booking.reference }}
            className="rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground"
          >
            View my booking
          </Link>
          <Link
            to="/packages"
            className="rounded-full border border-border px-6 py-3 text-sm font-bold"
          >
            Explore more trips
          </Link>
        </div>
        <p className="mt-7 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-forest" />
          Processed by the local development mock provider. No real card was
          charged.
        </p>
      </div>
    </section>
  );
}
function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-accent p-4">
      <p className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
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
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00.000Z`));
}
function title(value: string) {
  return value
    .split("_")
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}
