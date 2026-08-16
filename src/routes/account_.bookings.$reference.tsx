import {
  createFileRoute,
  Link,
  notFound,
  redirect,
  useNavigate,
  useRouter,
} from "@tanstack/react-router";
import {
  CalendarDays,
  CircleDollarSign,
  Clock3,
  FileText,
  Map,
  ShieldCheck,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import {
  cancelMyBookingFn,
  getMyBookingByReferenceFn,
  getMyCancellationPreviewFn,
  uploadMyBookingIdentityDocumentFn,
} from "@/lib/booking.functions";
import { countryName } from "@/lib/countries";
import { downloadMyVerifiedBookingIdentityDocumentFn } from "@/lib/identity-documents.functions";

export const Route = createFileRoute("/account_/bookings/$reference")({
  loader: async ({ params }) => {
    if (!/^NH-\d{4}-[A-F0-9]{16}$/.test(params.reference)) throw notFound();
    const result = await getMyBookingByReferenceFn({
      data: { reference: params.reference },
    });
    if (
      !result.ok &&
      (result.code === "AUTH_REQUIRED" || result.code === "CUSTOMER_REQUIRED")
    )
      throw redirect({
        to: "/login",
        search: {
          redirect: `/account/bookings/${encodeURIComponent(params.reference)}`,
        },
      });
    if (!result.ok && result.code === "BOOKING_NOT_FOUND") throw notFound();
    return result;
  },
  component: BookingDetailPage,
});

function BookingDetailPage() {
  const result = Route.useLoaderData();
  const { reference } = Route.useParams();
  const { user, ready } = useAuth();
  const navigate = useNavigate();
  const router = useRouter();
  const [documentType, setDocumentType] = useState<"passport" | "national_id">(
    "passport",
  );
  const [document, setDocument] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [actionError, setActionError] = useState("");
  const [preview, setPreview] = useState<
    | Extract<
        Awaited<ReturnType<typeof getMyCancellationPreviewFn>>,
        { ok: true }
      >["preview"]
    | null
  >(null);
  const [reason, setReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  useEffect(() => {
    if (ready && (!user || user.role !== "customer"))
      void navigate({
        to: "/login",
        search: {
          redirect: `/account/bookings/${encodeURIComponent(reference)}`,
        },
        replace: true,
      });
  }, [ready, user, navigate, reference]);
  if (!ready || !user || user.role !== "customer")
    return <div className="min-h-[70vh]" />;
  if (!result.ok)
    return (
      <section className="container-lux py-24 text-center">
        <h1 className="text-4xl font-semibold">Booking unavailable</h1>
        <p className="mt-4 text-muted-foreground">
          We couldn't load this booking right now.
        </p>
        <Link
          to="/account"
          className="mt-7 inline-flex rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground"
        >
          Back to my account
        </Link>
      </section>
    );
  const booking = result.booking;
  const refundTransaction = [...booking.paymentHistory]
    .reverse()
    .find(
      (payment) =>
        payment.purpose === "refund" &&
        (payment.status === "refunded" || payment.status === "paid"),
    );

  async function upload(event: FormEvent) {
    event.preventDefault();
    if (!document) return setActionError("Choose a passport or ID file.");
    const data = new FormData();
    data.set("reference", booking.reference);
    data.set("documentType", documentType);
    data.set("identityDocument", document);
    setUploading(true);
    setActionError("");
    try {
      const response = await uploadMyBookingIdentityDocumentFn({ data });
      if (!response.ok) return setActionError(response.message);
      window.location.reload();
    } finally {
      setUploading(false);
    }
  }
  async function prepareCancellation() {
    setActionError("");
    const response = await getMyCancellationPreviewFn({
      data: { reference: booking.reference },
    });
    if (!response.ok) setActionError(response.message);
    else setPreview(response.preview);
  }
  async function viewDocument() {
    if (!booking.identityDocument) return;
    setDownloading(true);
    setActionError("");
    try {
      const response = await downloadMyVerifiedBookingIdentityDocumentFn({
        data: { documentId: booking.identityDocument.id },
      });
      if (!response.ok)
        return setActionError("This verified document is unavailable.");
      const binary = atob(response.document.base64);
      const bytes = Uint8Array.from(binary, (character) =>
        character.charCodeAt(0),
      );
      const url = URL.createObjectURL(
        new Blob([bytes], { type: response.document.mimeType }),
      );
      const opened = window.open(url, "_blank", "noopener,noreferrer");
      if (!opened) {
        const anchor = window.document.createElement("a");
        anchor.href = url;
        anchor.download = response.document.filename;
        anchor.click();
      }
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } finally {
      setDownloading(false);
    }
  }
  async function confirmCancellation() {
    setCancelling(true);
    setActionError("");
    let cancellationCommitted = false;
    try {
      const response = await cancelMyBookingFn({
        data: { reference: booking.reference, reason: reason || undefined },
      });
      if (!response.ok) return setActionError(response.message);
      cancellationCommitted = true;
      setPreview(null);
      await router.invalidate();
    } catch {
      if (cancellationCommitted) {
        window.location.reload();
        return;
      }
      setActionError(
        "We couldn't cancel this booking right now. Please try again.",
      );
    } finally {
      setCancelling(false);
    }
  }

  return (
    <section className="container-lux py-14 lg:py-24">
      <div className="mx-auto max-w-5xl">
        <Link
          to="/account"
          className="text-sm font-bold text-primary hover:text-gold"
        >
          ← Back to my account
        </Link>
        <div className="mt-6 overflow-hidden rounded-[2rem] border border-border bg-card shadow-[var(--shadow-soft)]">
          <div className="grid lg:grid-cols-[22rem_1fr]">
            {booking.packageImage ? (
              <img
                src={booking.packageImage}
                alt={booking.packageTitle}
                className="h-full min-h-72 w-full object-cover"
              />
            ) : (
              <div className="grid min-h-72 place-items-center bg-accent text-gold">
                <Map className="h-10 w-10" />
              </div>
            )}
            <div className="p-7 lg:p-10">
              <div className="flex flex-wrap items-center gap-3">
                <p className="eyebrow text-gold">Booking {booking.reference}</p>
                <span className="rounded-full bg-forest/10 px-3 py-1 text-xs font-bold uppercase text-forest">
                  {title(booking.status)}
                </span>
              </div>
              <h1 className="mt-4 font-[family-name:var(--font-display)] text-4xl font-semibold text-primary">
                {booking.packageTitle}
              </h1>
              <p className="mt-3 text-sm text-muted-foreground">
                Booked {dateTime(booking.createdDate)}
                {booking.cancelledDate
                  ? ` · Cancelled ${dateTime(booking.cancelledDate)}`
                  : ""}
              </p>
              <div className="mt-7 grid gap-4 sm:grid-cols-3">
                <Summary
                  icon={CalendarDays}
                  label="Departure"
                  value={date(booking.departureDate)}
                />
                <Summary
                  icon={Users}
                  label="Travellers"
                  value={String(booking.travellers)}
                />
                <Summary
                  icon={Clock3}
                  label="Tier"
                  value={booking.tierName || "Standard"}
                />
              </div>
              <p className="mt-4 text-xs text-muted-foreground">
                {booking.packageDays} days ·{" "}
                {booking.packageDifficulty || "Difficulty not specified"}
              </p>
              <Link
                to="/packages/$slug"
                params={{ slug: booking.packageSlug }}
                className="mt-5 inline-flex rounded-full border border-border px-5 py-2.5 text-sm font-bold hover:border-gold hover:text-gold"
              >
                View Package
              </Link>
            </div>
          </div>
        </div>
        {actionError ? (
          <p
            role="alert"
            className="mt-6 rounded-2xl bg-destructive/5 p-4 text-sm text-destructive"
          >
            {actionError}
          </p>
        ) : null}
        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <Card title="Primary customer / traveller" icon={UserRound}>
            {booking.customerProfile ? (
              <dl className="grid gap-4 sm:grid-cols-2">
                <Detail label="Name" value={booking.customerProfile.name} />
                <Detail label="Email" value={booking.customerProfile.email} />
                <Detail
                  label="Contact number"
                  value={booking.customerProfile.phone || "Not provided"}
                />
                <Detail
                  label="Nationality"
                  value={
                    countryName(booking.customerProfile.nationality) ||
                    "Not provided"
                  }
                />
                <Detail
                  label="Date of birth"
                  value={
                    booking.customerProfile.dateOfBirth
                      ? date(booking.customerProfile.dateOfBirth)
                      : "Not provided"
                  }
                />
                <Detail
                  label="Traveller record"
                  value={`Primary traveller of ${booking.travellers}`}
                />
              </dl>
            ) : (
              <p className="text-sm text-muted-foreground">
                Primary traveller details are unavailable.
              </p>
            )}
          </Card>
          <Card title="Price breakdown" icon={CircleDollarSign}>
            <dl className="space-y-4">
              <Detail
                label="Unit / tier price"
                value={money(booking.unitPrice, booking.currency)}
                row
              />
              <Detail
                label="Subtotal"
                value={money(booking.subtotal, booking.currency)}
                row
              />
              <Detail
                label={`VAT (${booking.vatPercentage}%)`}
                value={money(booking.vatAmount, booking.currency)}
                row
              />
              <Detail
                label="Grand total"
                value={money(booking.total, booking.currency)}
                row
              />
            </dl>
            <p className="mt-5 border-t border-border pt-4 text-xs text-muted-foreground">
              Historical commercial snapshots; current package changes do not
              alter them.
            </p>
          </Card>
          <Card title="Payment" icon={ShieldCheck}>
            <dl className="space-y-4">
              <Detail
                label="Initial payment choice"
                value={
                  booking.initialPaymentOption === "full"
                    ? "Full payment"
                    : "Advance payment"
                }
                row
              />
              <Detail
                label="Initial payment percentage"
                value={`${booking.initialPaymentPercentage}%`}
                row
              />
              <Detail
                label="Amount paid"
                value={money(booking.amountPaid, booking.currency)}
                row
              />
              {booking.status === "cancelled" ? (
                <>
                  <Detail
                    label="Refund amount"
                    value={money(booking.refundAmount, booking.currency)}
                    row
                  />
                  {booking.refundedAmount > 0 ? (
                    <Detail
                      label="Refunded amount"
                      value={money(booking.refundedAmount, booking.currency)}
                      row
                    />
                  ) : null}
                  <Detail
                    label="Remaining amount"
                    value="Not due — booking cancelled"
                    row
                  />
                  <Detail
                    label="Refund status"
                    value={refundLabel(booking.refundStatus)}
                    row
                  />
                  {refundTransaction ? (
                    <Detail
                      label="Refund date"
                      value={dateTime(
                        refundTransaction.paidAt ||
                          refundTransaction.createdDate,
                      )}
                      row
                    />
                  ) : null}
                </>
              ) : (
                <>
                  <Detail
                    label="Remaining amount"
                    value={money(booking.remainingBalance, booking.currency)}
                    row
                  />
                  <Detail
                    label="Due date"
                    value={
                      booking.balanceDueDate
                        ? date(booking.balanceDueDate)
                        : "-"
                    }
                    row
                  />
                </>
              )}
              {booking.status !== "cancelled" ? (
                <Detail
                  label="Payment status"
                  value={title(booking.paymentStatus)}
                  row
                />
              ) : null}
              {booking.refundStatus === "processed_for_refund" ? (
                <p className="rounded-2xl bg-accent p-4 text-xs leading-relaxed text-muted-foreground">
                  Your cancellation has been processed and the eligible refund
                  is awaiting refund processing.
                </p>
              ) : null}
            </dl>
          </Card>
          <Card title="Payment / refund history" icon={Clock3}>
            {booking.paymentHistory.length ? (
              <div className="space-y-3">
                {booking.paymentHistory.map((payment, index) => (
                  <div
                    key={`${payment.createdDate}-${index}`}
                    className="rounded-2xl bg-accent p-4 text-sm"
                  >
                    <div className="flex justify-between gap-3">
                      <strong>
                        {payment.purpose ? title(payment.purpose) : "Payment"}
                      </strong>
                      <strong>{money(payment.amount, payment.currency)}</strong>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {title(payment.status)} ·{" "}
                      {payment.provider || "Provider not recorded"} ·{" "}
                      {dateTime(payment.paidAt || payment.createdDate)}
                    </p>
                    {payment.reference ? (
                      <p className="mt-1 break-all text-xs text-muted-foreground">
                        Reference: {payment.reference}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No payment history available.
              </p>
            )}
          </Card>
          <Card title="Passport / ID" icon={FileText}>
            {booking.identityDocument ? (
              <div className="rounded-2xl bg-accent p-4">
                <Detail
                  label="Document type"
                  value={
                    booking.identityDocument.documentType === "passport"
                      ? "Passport"
                      : "National ID"
                  }
                />
                <Detail
                  label="Uploaded"
                  value={dateTime(booking.identityDocument.uploadedAt)}
                />
                <Detail
                  label="Verification"
                  value={documentStatusLabel(
                    booking.identityDocument.verificationStatus,
                  )}
                />
                {booking.identityDocument.verificationStatus === "verified" ? (
                  <button
                    type="button"
                    disabled={downloading}
                    onClick={() => void viewDocument()}
                    className="mt-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-60"
                  >
                    {downloading ? "Opening..." : "View Document"}
                  </button>
                ) : booking.identityDocument.verificationStatus ===
                  "rejected" ? (
                  <form
                    onSubmit={upload}
                    className="mt-4 border-t border-border pt-4"
                  >
                    <p className="mb-3 text-xs text-muted-foreground">
                      This document was rejected. Upload a replacement for a new
                      review.
                    </p>
                    <div className="grid gap-3">
                      <select
                        value={documentType}
                        onChange={(event) =>
                          setDocumentType(
                            event.target.value as "passport" | "national_id",
                          )
                        }
                        className="h-11 rounded-xl border border-border bg-background px-3 text-sm"
                      >
                        <option value="passport">Passport</option>
                        <option value="national_id">
                          National ID / Government ID
                        </option>
                      </select>
                      <input
                        required
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
                        onChange={(event) =>
                          setDocument(event.target.files?.[0] ?? null)
                        }
                        className="text-sm"
                      />
                      <button
                        disabled={uploading}
                        className="rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-60"
                      >
                        {uploading ? "Uploading..." : "Upload Replacement"}
                      </button>
                    </div>
                  </form>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Your document will become viewable here after verification.
                  </p>
                )}
              </div>
            ) : (
              <form onSubmit={upload}>
                <p className="text-sm text-muted-foreground">
                  No passport or ID uploaded yet.
                </p>
                <div className="mt-4 grid gap-3">
                  <select
                    value={documentType}
                    onChange={(event) =>
                      setDocumentType(
                        event.target.value as "passport" | "national_id",
                      )
                    }
                    className="h-11 rounded-xl border border-border bg-background px-3 text-sm"
                  >
                    <option value="passport">Passport</option>
                    <option value="national_id">
                      National ID / Government ID
                    </option>
                  </select>
                  <input
                    required
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
                    onChange={(event) =>
                      setDocument(event.target.files?.[0] ?? null)
                    }
                    className="text-sm"
                  />
                  <button
                    disabled={uploading}
                    className="rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-60"
                  >
                    {uploading ? "Uploading..." : "Upload Passport / ID"}
                  </button>
                </div>
              </form>
            )}
          </Card>
          <Card title="Customer notes" icon={Clock3}>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {booking.notes || "No notes were provided with this booking."}
            </p>
          </Card>
          <Card title="Cancellation policy" icon={ShieldCheck}>
            <Detail
              label="Effective fee snapshot"
              value={
                booking.cancellationFeeType === "fixed"
                  ? `${money(booking.cancellationFeeValue, booking.currency)} fixed (${booking.cancellationPolicySource || "configured"})`
                  : `${booking.cancellationFeeValue}% of grand total (${booking.cancellationPolicySource || "configured"})`
              }
            />
            <Detail
              label="Estimated fee"
              value={money(booking.estimatedCancellationFee, booking.currency)}
            />
            {booking.status === "cancelled" ? (
              <div className="mt-4 rounded-2xl bg-accent p-4">
                <Detail
                  label="Cancellation fee"
                  value={money(booking.cancellationFeeAmount, booking.currency)}
                />
                <Detail
                  label="Refund amount"
                  value={money(booking.refundAmount, booking.currency)}
                />
                <Detail
                  label="Refund status"
                  value={refundLabel(booking.refundStatus)}
                />
                <Detail
                  label="Refund deadline"
                  value={
                    booking.refundProcessingDeadline
                      ? dateTime(booking.refundProcessingDeadline)
                      : "Not applicable"
                  }
                />
                {booking.refundedAmount > 0 ? (
                  <Detail
                    label="Refunded amount"
                    value={money(booking.refundedAmount, booking.currency)}
                  />
                ) : null}
                <Detail
                  label="Reason"
                  value={booking.cancellationReason || "No reason supplied"}
                />
              </div>
            ) : (
              <button
                onClick={() => void prepareCancellation()}
                className="mt-5 rounded-full border border-destructive/30 px-5 py-2.5 text-sm font-bold text-destructive"
              >
                Cancel Booking
              </button>
            )}
          </Card>
        </div>
        {preview ? (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4"
          >
            <div className="w-full max-w-lg rounded-3xl bg-card p-7 shadow-xl">
              <h2 className="text-2xl font-semibold">Confirm cancellation</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Review the financial effect before confirming. This cannot be
                undone here.
              </p>
              <dl className="mt-5 space-y-3">
                <Detail
                  label="Grand total"
                  value={money(preview.grandTotal, preview.currency)}
                  row
                />
                <Detail
                  label="Amount paid"
                  value={money(preview.amountPaid, preview.currency)}
                  row
                />
                <Detail
                  label={
                    preview.cancellationFeeType === "fixed"
                      ? `Cancellation fee (${money(preview.cancellationFeeValue, preview.currency)} fixed)`
                      : `Cancellation fee (${preview.cancellationFeeValue}% of grand total)`
                  }
                  value={money(preview.cancellationFeeAmount, preview.currency)}
                  row
                />
                <Detail
                  label="Refund"
                  value={money(preview.refundAmount, preview.currency)}
                  row
                />
                <Detail
                  label="Outstanding balance voided"
                  value={money(
                    preview.outstandingBalanceVoided,
                    preview.currency,
                  )}
                  row
                />
              </dl>
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                maxLength={1000}
                rows={3}
                placeholder="Cancellation reason (optional)"
                className="mt-5 w-full rounded-2xl border border-border bg-background p-3 text-sm"
              />
              <div className="mt-5 flex gap-3">
                <button
                  onClick={() => setPreview(null)}
                  className="flex-1 rounded-full border border-border px-5 py-3 text-sm font-bold"
                >
                  Keep booking
                </button>
                <button
                  disabled={cancelling}
                  onClick={() => void confirmCancellation()}
                  className="flex-1 rounded-full bg-destructive px-5 py-3 text-sm font-bold text-destructive-foreground disabled:opacity-60"
                >
                  {cancelling ? "Cancelling..." : "Confirm cancellation"}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function Summary({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-accent p-4">
      <Icon className="h-4 w-4 text-gold" />
      <p className="mt-3 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}
function Card({
  title: heading,
  icon: Icon,
  children,
}: {
  title: string;
  icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-border bg-card p-7">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-full bg-accent text-gold">
          <Icon className="h-5 w-5" />
        </div>
        <h2 className="text-xl font-semibold">{heading}</h2>
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}
function Detail({
  label,
  value,
  row = false,
}: {
  label: string;
  value: string;
  row?: boolean;
}) {
  return (
    <div className={row ? "flex justify-between gap-4" : "mb-4"}>
      <dt className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </dt>
      <dd className={`${row ? "text-right" : "mt-1"} text-sm font-semibold`}>
        {value}
      </dd>
    </div>
  );
}
function date(value: string) {
  if (!value) return "To be arranged";
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00.000Z`));
}
function dateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(value));
}
function money(value: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(
    value,
  );
}
function title(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function refundLabel(
  status:
    | "none"
    | "processed_for_refund"
    | "partially_refunded"
    | "refunded"
    | "refund_failed"
    | "no_refund_due",
) {
  return {
    none: "None",
    processed_for_refund: "Processed for Refund",
    partially_refunded: "Partially Refunded",
    refunded: "Refunded",
    refund_failed: "Refund Failed",
    no_refund_due: "No Refund Due",
  }[status];
}

function documentStatusLabel(status: "pending" | "verified" | "rejected") {
  if (status === "pending") return "Pending Verification";
  return status === "verified" ? "Verified" : "Rejected";
}
