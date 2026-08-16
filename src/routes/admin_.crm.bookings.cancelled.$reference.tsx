import {
  createFileRoute,
  Link,
  notFound,
  redirect,
  useNavigate,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { getAdminCancelledBookingFn } from "@/lib/booking.functions";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute(
  "/admin_/crm/bookings/cancelled/$reference",
)({
  loader: async ({ params }) => {
    if (!/^NH-\d{4}-[A-F0-9]{16}$/.test(params.reference)) throw notFound();
    const returnPath = `/admin/crm/bookings/cancelled/${encodeURIComponent(params.reference)}`;
    const result = await getAdminCancelledBookingFn({
      data: { reference: params.reference },
    });
    if (
      !result.ok &&
      (result.code === "AUTH_REQUIRED" || result.code === "CUSTOMER_REQUIRED")
    )
      throw redirect({
        to: "/admin",
        search: { redirect: returnPath },
      });
    if (!result.ok && result.code === "BOOKING_NOT_FOUND") throw notFound();
    return result;
  },
  component: AdminCancelledBookingPage,
});

function AdminCancelledBookingPage() {
  const result = Route.useLoaderData();
  const { reference } = Route.useParams();
  const { user, ready } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (ready && (!user || user.role !== "admin"))
      void navigate({
        to: "/admin",
        search: {
          redirect: `/admin/crm/bookings/cancelled/${encodeURIComponent(reference)}`,
        },
        replace: true,
      });
  }, [ready, user, navigate, reference]);
  if (!ready || !user || user.role !== "admin")
    return <div className="min-h-screen bg-[#f6f5f1]" />;
  if (!result.ok)
    return (
      <main className="container-lux py-24 text-center">
        <h1 className="text-4xl font-semibold">
          Cancelled booking unavailable
        </h1>
        <Link
          to="/admin/dashboard"
          className="mt-6 inline-block font-bold text-primary"
        >
          Return to dashboard
        </Link>
      </main>
    );
  const booking = result.booking;
  return (
    <div className="min-h-screen bg-[#f6f5f1]">
      <header className="bg-[#0c1724] px-6 py-5 text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link to="/admin/dashboard" className="text-xl font-semibold">
            Nepal Heaven <span className="text-gold">Admin</span>
          </Link>
          <span className="text-sm text-white/60">Cancelled booking</span>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-10">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold">
          Booking operations
        </p>
        <h1 className="mt-2 text-4xl font-semibold text-[#0c1724]">
          {booking.reference}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Cancelled {dateTime(booking.cancelledAt)}
        </p>
        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <Panel
            title="Customer"
            rows={[
              ["Name", booking.customerName],
              ["Email", booking.customerEmail],
              ["Phone", booking.customerPhone || "Not provided"],
              [
                "Country / nationality",
                booking.customerNationality ||
                  booking.customerCountry ||
                  "Not provided",
              ],
            ]}
          />
          <Panel
            title="Journey & cancellation"
            rows={[
              ["Package", booking.packageName],
              ["Tier", booking.tierName || "Not specified"],
              ["Destination", booking.destinationName || "Not specified"],
              ["Departure", booking.departureDate || "Not specified"],
              ["Travellers", String(booking.travellers)],
              ["Reason", booking.cancellationReason || "Not provided"],
            ]}
          />
          <Panel
            title="Payment & refund"
            rows={[
              ["Grand total", money(booking.grandTotal, booking.currency)],
              ["Total paid", money(booking.amountPaid, booking.currency)],
              [
                "Previously refunded",
                money(booking.previouslyRefunded, booking.currency),
              ],
              [
                "Policy",
                booking.cancellationFeeType === "fixed"
                  ? `Fixed ${money(booking.cancellationFeeValue, booking.currency)}`
                  : `${Number(booking.cancellationFeeValue).toFixed(2)}% of grand total`,
              ],
              [
                "Cancellation fee",
                money(booking.cancellationFeeAmount, booking.currency),
              ],
              ["Refund due", money(booking.refundDue, booking.currency)],
              ["Refund status", label(booking.refundStatus)],
              [
                "Refund deadline",
                booking.refundDeadline
                  ? dateTime(booking.refundDeadline)
                  : "Not applicable",
              ],
              [
                "Payment reference(s)",
                booking.paymentReferences.join(", ") || "Not provided",
              ],
            ]}
          />
        </div>
      </main>
    </div>
  );
}

function Panel({
  title,
  rows,
}: {
  title: string;
  rows: Array<[string, string]>;
}) {
  return (
    <section className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold">{title}</h2>
      <dl className="mt-5 space-y-4">
        {rows.map(([name, value]) => (
          <div key={name}>
            <dt className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              {name}
            </dt>
            <dd className="mt-1 break-words text-sm font-semibold">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function money(value: string | null, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(
    Number(value || 0),
  );
}
function dateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
function label(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
