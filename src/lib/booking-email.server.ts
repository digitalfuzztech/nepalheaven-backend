import { createHash, randomUUID } from "node:crypto";
import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { bookings, bookingTravellers, payments } from "@/db/schema/bookings";
import { leadInteractions } from "@/db/schema/communications";
import { destinations } from "@/db/schema/destinations";
import { packages, packageTiers } from "@/db/schema/packages";
import { users } from "@/db/schema/users";
import { sendTemplatedEmail } from "@/lib/email.server";
import { buildAppUrl, getAppUrl } from "@/lib/app-url.server";
import { getMailRouting } from "@/lib/mail-routing.server";
import { createBookingInvoicePdf } from "@/lib/booking-invoice.server";
import type { EmailAttachment } from "@/lib/email.server";

type BookingTemplateKey =
  | "booking_customer_confirmation"
  | "booking_admin_notification"
  | "booking_cancellation_customer"
  | "booking_cancellation_admin";

type MailVariables = Record<string, string | number | null | undefined>;

export function getBookingPaymentTypeLabel(
  option: "minimum" | "full" | null,
  purpose?: "deposit" | "full" | "balance" | "additional" | "refund" | null,
) {
  return option === "full" || purpose === "full"
    ? "Full Payment"
    : "Advance Payment";
}

export function getBookingPaymentStatusLabel(remainingBalance: string | null) {
  return Number(remainingBalance ?? "0") <= 0
    ? "Paid in Full"
    : "Partially Paid";
}

export function getPaymentMethodLabel(provider: string | null) {
  const known: Record<string, string> = {
    dev_mock: "Card (development mock)",
    stripe: "Card",
    esewa: "eSewa",
    bank_transfer: "Bank Transfer",
  };
  const normalized = provider?.trim().toLowerCase() ?? "";
  if (known[normalized]) return known[normalized];
  if (!normalized) return "Not specified";
  return normalized
    .split(/[_-]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function getBookingEmailUrls(reference: string) {
  const encoded = encodeURIComponent(reference);
  return {
    customerBookingUrl: buildAppUrl(`/account/bookings/${encoded}`),
    adminBookingUrl: buildAppUrl(`/admin/crm/bookings/confirmed/${encoded}`),
  };
}

export function getBookingCancellationEmailUrls(reference: string) {
  const encoded = encodeURIComponent(reference);
  return {
    customerBookingUrl: buildAppUrl(`/account/bookings/${encoded}`),
    adminCancelledBookingUrl: buildAppUrl(
      `/admin/crm/bookings/cancelled/${encoded}`,
    ),
  };
}

function safeFailure(error: unknown) {
  const message =
    error instanceof Error ? error.message : "Unknown mail transport failure";
  return message
    .replace(/(pass(word)?|credential|auth)\s*[=:]\s*\S+/gi, "$1=[redacted]")
    .slice(0, 1000);
}

function deterministicInteractionId(
  bookingId: string,
  key: BookingTemplateKey,
) {
  const hex = createHash("sha256")
    .update(`booking-email:${bookingId}:${key}`)
    .digest("hex")
    .slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20)}`;
}

function formatMoney(value: string | null) {
  const amount = Number(value ?? "0");
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function formatDate(value: Date | string | null) {
  if (!value) return "Not specified";
  const date =
    typeof value === "string"
      ? new Date(`${value.slice(0, 10)}T00:00:00Z`)
      : value;
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function formatTimestamp(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  }).format(value);
}

function validReplyAddress(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? value : undefined;
}

async function sendBookingEmailOnce(input: {
  bookingId: string;
  bookingReference: string;
  userId: string;
  paymentReference: string | null;
  templateKey: BookingTemplateKey;
  interactionType:
    "booking_confirmation" | "booking_cancellation" | "admin_notification";
  to: string;
  replyTo?: string;
  variables: MailVariables;
  attachments?: EmailAttachment[];
}) {
  if (!db) return { status: "failed" as const, reason: "Database unavailable" };
  const interactionId = deterministicInteractionId(
    input.bookingId,
    input.templateKey,
  );
  const expectedRoute = getMailRouting().bookings;
  const attemptToken = randomUUID();
  await db
    .insert(leadInteractions)
    .values({
      id: interactionId,
      leadId: null,
      channel: "email",
      direction: "outbound",
      interactionType: input.interactionType,
      templateKey: input.templateKey,
      body: "Booking email queued for template rendering.",
      fromAddress: expectedRoute.address,
      toAddress: input.to,
      deliveryStatus: "pending",
      metadata: JSON.stringify({
        attemptToken,
        bookingId: input.bookingId,
        bookingReference: input.bookingReference,
        userId: input.userId,
        paymentReference: input.paymentReference,
        templateKey: input.templateKey,
        mailRoute: expectedRoute.key,
        replyTo: input.replyTo || expectedRoute.replyTo,
        attachments:
          input.attachments?.map((attachment) => ({
            filename: attachment.filename,
            contentType: attachment.contentType,
            size: attachment.content.length,
          })) ?? [],
      }),
    })
    .onDuplicateKeyUpdate({ set: { id: sql`${leadInteractions.id}` } });

  const [record] = await db
    .select({
      metadata: leadInteractions.metadata,
      deliveryStatus: leadInteractions.deliveryStatus,
    })
    .from(leadInteractions)
    .where(eq(leadInteractions.id, interactionId))
    .limit(1);
  const ownsAttempt = record?.metadata?.includes(
    `"attemptToken":"${attemptToken}"`,
  );
  if (!ownsAttempt)
    return {
      status: "skipped" as const,
      existingStatus: record?.deliveryStatus,
    };

  try {
    const sent = await sendTemplatedEmail({
      templateKey: input.templateKey,
      to: input.to,
      variables: input.variables,
      ...(input.replyTo ? { replyTo: input.replyTo } : {}),
      ...(input.attachments ? { attachments: input.attachments } : {}),
    });
    await db
      .update(leadInteractions)
      .set({
        subject: sent.subject,
        body: sent.text,
        fromAddress: sent.fromAddress,
        provider: sent.provider,
        providerMessageId: sent.messageId,
        deliveryStatus: sent.accepted ? "sent" : "pending",
        sentAt: sent.accepted ? new Date() : null,
        failureReason: null,
        updatedAt: new Date(),
        metadata: JSON.stringify({
          bookingId: input.bookingId,
          bookingReference: input.bookingReference,
          userId: input.userId,
          paymentReference: input.paymentReference,
          templateKey: input.templateKey,
          transportMode: sent.provider,
          acceptedByProvider: sent.accepted,
          mailRoute: sent.route,
          replyTo: sent.replyTo,
          fromNameAndAddress: sent.from,
          attachments: sent.attachments,
        }),
      })
      .where(eq(leadInteractions.id, interactionId));
    return { status: sent.accepted ? ("sent" as const) : ("pending" as const) };
  } catch (error) {
    const failureReason = safeFailure(error);
    await db
      .update(leadInteractions)
      .set({
        deliveryStatus: "failed",
        failureReason,
        updatedAt: new Date(),
      })
      .where(eq(leadInteractions.id, interactionId));
    console.error("Booking email failed after booking persistence", {
      bookingReference: input.bookingReference,
      templateKey: input.templateKey,
      error: failureReason,
    });
    return { status: "failed" as const, reason: failureReason };
  }
}

export async function sendBookingConfirmationEmails(bookingId: string) {
  if (!db) return [];
  const [snapshot] = await db
    .select({
      bookingId: bookings.id,
      bookingReference: bookings.bookingReference,
      userId: bookings.userId,
      bookingStatus: bookings.status,
      departureDate: bookings.departureDate,
      travellers: bookings.travellers,
      initialPaymentOption: bookings.initialPaymentOption,
      grandTotal: bookings.total,
      amountPaid: bookings.amountInitiallyPaid,
      remainingBalance: bookings.remainingBalanceSnapshot,
      currency: bookings.currency,
      bookingCreatedAt: bookings.createdAt,
      packageName: packages.title,
      tierName: packageTiers.name,
      destinationName: destinations.name,
      accountName: users.name,
      accountEmail: users.email,
      accountPhone: users.phone,
      accountCountry: users.country,
      accountNationality: users.nationality,
    })
    .from(bookings)
    .innerJoin(users, eq(users.id, bookings.userId))
    .innerJoin(packages, eq(packages.id, bookings.packageId))
    .leftJoin(packageTiers, eq(packageTiers.id, bookings.packageTierId))
    .leftJoin(destinations, eq(destinations.id, packages.destinationId))
    .where(and(eq(bookings.id, bookingId), eq(bookings.status, "confirmed")))
    .limit(1);
  if (!snapshot) return [];

  const [[traveller], [payment]] = await Promise.all([
    db
      .select()
      .from(bookingTravellers)
      .where(eq(bookingTravellers.bookingId, bookingId))
      .limit(1),
    db
      .select()
      .from(payments)
      .where(
        and(eq(payments.bookingId, bookingId), eq(payments.status, "paid")),
      )
      .orderBy(asc(payments.createdAt))
      .limit(1),
  ]);
  if (!payment) return [];

  const customerName = traveller
    ? `${traveller.firstName} ${traveller.lastName}`.trim()
    : snapshot.accountName;
  const customerEmail = traveller?.email?.trim() || snapshot.accountEmail;
  const customerPhone =
    traveller?.phone?.trim() || snapshot.accountPhone || "Not provided";
  const customerCountry =
    traveller?.nationality ||
    snapshot.accountNationality ||
    snapshot.accountCountry ||
    "Not provided";
  const paymentType = getBookingPaymentTypeLabel(
    snapshot.initialPaymentOption,
    payment.purpose,
  );
  const paymentStatus = getBookingPaymentStatusLabel(snapshot.remainingBalance);
  const { customerBookingUrl, adminBookingUrl } = getBookingEmailUrls(
    snapshot.bookingReference,
  );
  const siteUrl = getAppUrl();
  const variables: MailVariables = {
    bookingReference: snapshot.bookingReference,
    bookingStatus: "Confirmed",
    confirmedAt: formatTimestamp(payment.paidAt || snapshot.bookingCreatedAt),
    customerName,
    customerEmail,
    customerPhone,
    customerCountry,
    packageName: snapshot.packageName,
    tierName: snapshot.tierName || "Not specified",
    destinationName: snapshot.destinationName || "Not specified",
    startDate: formatDate(snapshot.departureDate),
    endDate: "Not specified",
    travellers: snapshot.travellers,
    paymentType,
    paymentMethod: getPaymentMethodLabel(payment.provider),
    paymentStatus,
    currency: snapshot.currency,
    grandTotal: formatMoney(snapshot.grandTotal),
    amountPaid: formatMoney(snapshot.amountPaid || payment.amount),
    remainingBalance: formatMoney(snapshot.remainingBalance),
    paymentReference: payment.providerTransactionId || "Not provided",
    customerBookingUrl,
    adminBookingUrl,
    siteUrl,
    paymentMessage:
      paymentType === "Full Payment"
        ? "Your booking is confirmed and your trip has been paid in full."
        : `Your booking is confirmed. We’ve received your advance payment of ${snapshot.currency} ${formatMoney(snapshot.amountPaid || payment.amount)} toward the total trip cost of ${snapshot.currency} ${formatMoney(snapshot.grandTotal)}. Remaining balance: ${snapshot.currency} ${formatMoney(snapshot.remainingBalance)}.`,
  };
  const adminTo = getMailRouting().bookings.internalRecipient;
  const adminReplyTo = validReplyAddress(customerEmail);
  const invoice = createBookingInvoicePdf({
    bookingReference: snapshot.bookingReference,
    paymentReference: payment.providerTransactionId || "Not provided",
    invoiceDate: formatDate(payment.paidAt || snapshot.bookingCreatedAt),
    customerName,
    customerEmail,
    customerPhone,
    customerCountry,
    packageName: snapshot.packageName,
    tierName: snapshot.tierName || "Not specified",
    destinationName: snapshot.destinationName || "Not specified",
    startDate: formatDate(snapshot.departureDate),
    endDate: "Not specified",
    travellers: snapshot.travellers,
    currency: snapshot.currency,
    grandTotal: formatMoney(snapshot.grandTotal),
    paymentType,
    amountPaid: formatMoney(snapshot.amountPaid || payment.amount),
    remainingBalance: formatMoney(snapshot.remainingBalance),
    paymentStatus,
    paymentMethod: getPaymentMethodLabel(payment.provider),
  });
  return Promise.all([
    sendBookingEmailOnce({
      bookingId,
      bookingReference: snapshot.bookingReference,
      userId: snapshot.userId,
      paymentReference: payment.providerTransactionId,
      templateKey: "booking_customer_confirmation",
      interactionType: "booking_confirmation",
      to: customerEmail,
      attachments: [invoice],
      variables: { ...variables, bookingUrl: customerBookingUrl },
    }),
    sendBookingEmailOnce({
      bookingId,
      bookingReference: snapshot.bookingReference,
      userId: snapshot.userId,
      paymentReference: payment.providerTransactionId,
      templateKey: "booking_admin_notification",
      interactionType: "admin_notification",
      to: adminTo,
      ...(adminReplyTo ? { replyTo: adminReplyTo } : {}),
      attachments: [invoice],
      variables: { ...variables, bookingUrl: adminBookingUrl },
    }),
  ]);
}

export async function sendBookingCancellationEmails(bookingId: string) {
  if (!db) return [];
  const [snapshot] = await db
    .select({
      bookingId: bookings.id,
      bookingReference: bookings.bookingReference,
      userId: bookings.userId,
      cancelledAt: bookings.cancelledAt,
      cancellationReason: bookings.cancellationReason,
      departureDate: bookings.departureDate,
      travellers: bookings.travellers,
      grandTotal: bookings.total,
      currency: bookings.currency,
      amountPaid: bookings.amountPaidAtCancellationSnapshot,
      previouslyRefunded: bookings.previouslyRefundedAmountSnapshot,
      cancellationFeeType: bookings.cancellationFeeTypeSnapshot,
      cancellationFeeValue: bookings.cancellationFeeValueSnapshot,
      cancellationFeeAmount: bookings.cancellationFeeAmount,
      refundDue: bookings.refundAmount,
      refundDeadline: bookings.refundProcessingDeadline,
      packageName: packages.title,
      tierName: packageTiers.name,
      destinationName: destinations.name,
      accountName: users.name,
      accountEmail: users.email,
      accountPhone: users.phone,
      accountCountry: users.country,
      accountNationality: users.nationality,
    })
    .from(bookings)
    .innerJoin(users, eq(users.id, bookings.userId))
    .innerJoin(packages, eq(packages.id, bookings.packageId))
    .leftJoin(packageTiers, eq(packageTiers.id, bookings.packageTierId))
    .leftJoin(destinations, eq(destinations.id, packages.destinationId))
    .where(and(eq(bookings.id, bookingId), eq(bookings.status, "cancelled")))
    .limit(1);
  if (!snapshot?.cancelledAt) return [];

  const [[traveller], paymentRows] = await Promise.all([
    db
      .select()
      .from(bookingTravellers)
      .where(eq(bookingTravellers.bookingId, bookingId))
      .orderBy(asc(bookingTravellers.id))
      .limit(1),
    db
      .select()
      .from(payments)
      .where(eq(payments.bookingId, bookingId))
      .orderBy(asc(payments.createdAt)),
  ]);
  const customerName = traveller
    ? `${traveller.firstName} ${traveller.lastName}`.trim()
    : snapshot.accountName;
  const customerEmail = traveller?.email?.trim() || snapshot.accountEmail;
  const customerPhone =
    traveller?.phone?.trim() || snapshot.accountPhone || "Not provided";
  const customerCountry =
    traveller?.nationality ||
    snapshot.accountNationality ||
    snapshot.accountCountry ||
    "Not provided";
  const paymentReferences = paymentRows
    .filter((payment) => payment.purpose !== "refund")
    .map((payment) => payment.providerTransactionId?.trim())
    .filter((value): value is string => Boolean(value));
  const refundDue = Number(snapshot.refundDue ?? "0");
  const refundStatus = refundDue > 0 ? "Processed for Refund" : "No Refund Due";
  const refundDeadline = snapshot.refundDeadline
    ? formatDate(snapshot.refundDeadline)
    : "Not applicable";
  const cancellationFeeType =
    snapshot.cancellationFeeType === "fixed" ? "Fixed" : "Percentage";
  const cancellationFeeValue =
    snapshot.cancellationFeeType === "fixed"
      ? `${snapshot.currency} ${formatMoney(snapshot.cancellationFeeValue)}`
      : `${formatMoney(snapshot.cancellationFeeValue)}% of booking grand total`;
  const { customerBookingUrl, adminCancelledBookingUrl } =
    getBookingCancellationEmailUrls(snapshot.bookingReference);
  const variables: MailVariables = {
    bookingReference: snapshot.bookingReference,
    customerName,
    customerEmail,
    customerPhone,
    customerCountry,
    packageName: snapshot.packageName,
    tierName: snapshot.tierName || "Not specified",
    destinationName: snapshot.destinationName || "Not specified",
    startDate: formatDate(snapshot.departureDate),
    endDate: "Not specified",
    travellers: snapshot.travellers,
    cancelledAt: formatTimestamp(snapshot.cancelledAt),
    cancellationReason: snapshot.cancellationReason || "Not provided",
    currency: snapshot.currency,
    grandTotal: formatMoney(snapshot.grandTotal),
    amountPaid: formatMoney(snapshot.amountPaid),
    previouslyRefunded: formatMoney(snapshot.previouslyRefunded),
    cancellationFeeType,
    cancellationFeeValue,
    cancellationFeeAmount: formatMoney(snapshot.cancellationFeeAmount),
    refundDue: formatMoney(snapshot.refundDue),
    refundStatus,
    refundDeadline,
    paymentReference:
      paymentReferences.length > 0
        ? paymentReferences.join(", ")
        : "Not provided",
    customerBookingUrl,
    adminCancelledBookingUrl,
    siteUrl: getAppUrl(),
    refundMessage:
      refundDue > 0
        ? `Based on the cancellation policy applicable to your booking, ${snapshot.currency} ${formatMoney(snapshot.refundDue)} is due for refund. It will be processed within 15 calendar days of cancellation, no later than ${refundDeadline}. This records the refund obligation; it does not mean the money has already been returned.`
        : "No refund is due for this cancellation. No refund-processing deadline applies.",
  };
  const adminTo = getMailRouting().bookings.internalRecipient;
  const adminReplyTo = validReplyAddress(customerEmail);
  return Promise.all([
    sendBookingEmailOnce({
      bookingId,
      bookingReference: snapshot.bookingReference,
      userId: snapshot.userId,
      paymentReference: paymentReferences[0] || null,
      templateKey: "booking_cancellation_customer",
      interactionType: "booking_cancellation",
      to: customerEmail,
      variables,
    }),
    sendBookingEmailOnce({
      bookingId,
      bookingReference: snapshot.bookingReference,
      userId: snapshot.userId,
      paymentReference: paymentReferences[0] || null,
      templateKey: "booking_cancellation_admin",
      interactionType: "admin_notification",
      to: adminTo,
      ...(adminReplyTo ? { replyTo: adminReplyTo } : {}),
      variables,
    }),
  ]);
}
