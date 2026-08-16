import { createHash, randomBytes, randomUUID } from "node:crypto";
import { and, asc, desc, eq, gt, inArray, isNull } from "drizzle-orm";
import { getRequestHeader } from "@tanstack/react-start/server";
import { db } from "@/db";
import {
  bookingIntents,
  bookings,
  bookingTravellers,
  payments,
} from "@/db/schema/bookings";
import { bookingIdentityDocuments } from "@/db/schema/identity-documents";
import { packages, packageTiers } from "@/db/schema/packages";
import { destinations } from "@/db/schema/destinations";
import { sessions } from "@/db/schema/sessions";
import { users } from "@/db/schema/users";
import {
  calculateCancellationFee,
  calculateCommercialAmounts,
  centsToMoney,
  moneyToCents,
} from "@/lib/booking-money";
import { getBookingCommercialConfiguration } from "@/lib/booking-settings.server";
import { resolveAssetReference } from "@/lib/asset-resolver";
import {
  deletePrivateIdentityDocument,
  PrivateDocumentValidationError,
  storePrivateIdentityDocument,
} from "@/lib/private-document-storage.server";

const SESSION_COOKIE = "nepalheaven_session";
const CHECKOUT_LIFETIME_MS = 2 * 60 * 60 * 1000;

function nepalDate(value: Date | string) {
  if (typeof value === "string") return value.slice(0, 10);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kathmandu",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  return `${values["year"]}-${values["month"]}-${values["day"]}`;
}

export type CreateCheckoutIntentInput = {
  packageSlug: string;
  tierName: string;
  departureDate: string;
  travellers: number;
  notes?: string | undefined;
  documentType?: "passport" | "national_id" | undefined;
  document?: File | undefined;
};

export type BookingErrorCode =
  | "AUTH_REQUIRED"
  | "CUSTOMER_REQUIRED"
  | "PACKAGE_UNAVAILABLE"
  | "TIER_INVALID"
  | "CHECKOUT_NOT_FOUND"
  | "BOOKING_NOT_FOUND"
  | "PROFILE_INCOMPLETE"
  | "PAYMENT_FAILED"
  | "CANCELLATION_NOT_ALLOWED"
  | "DOCUMENT_INVALID"
  | "CONFIGURATION_ERROR";

export class PublicBookingError extends Error {
  constructor(
    public readonly code: BookingErrorCode,
    message: string,
  ) {
    super(message);
  }
}

export function requireDb() {
  if (!db)
    throw new Error(
      "Booking storage is unavailable because the database is not configured.",
    );
  return db;
}

function readSessionToken() {
  const cookie = getRequestHeader("cookie");
  if (!cookie) return null;
  for (const part of cookie.split(/;\s*/)) {
    const separator = part.indexOf("=");
    if (separator === -1) continue;
    if (part.slice(0, separator) === SESSION_COOKIE)
      return decodeURIComponent(part.slice(separator + 1));
  }
  return null;
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

type Transaction = Parameters<
  Parameters<NonNullable<typeof db>["transaction"]>[0]
>[0];

export async function requireAuthenticatedCustomer(transaction: Transaction) {
  const token = readSessionToken();
  if (!token)
    throw new PublicBookingError(
      "AUTH_REQUIRED",
      "Please sign in with a customer account.",
    );
  const [row] = await transaction
    .select({
      userId: users.id,
      role: users.role,
      emailVerifiedAt: users.emailVerifiedAt,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(
      and(
        eq(sessions.tokenHash, hashToken(token)),
        isNull(sessions.revokedAt),
        gt(sessions.expiresAt, new Date()),
      ),
    )
    .limit(1);
  if (!row)
    throw new PublicBookingError(
      "AUTH_REQUIRED",
      "Your session has expired. Please sign in again.",
    );
  if (row.role !== "customer" || !row.emailVerifiedAt)
    throw new PublicBookingError(
      "CUSTOMER_REQUIRED",
      "A customer account is required to access checkout and bookings.",
    );
  return row.userId;
}

async function requireAuthenticatedAdmin(transaction: Transaction) {
  const token = readSessionToken();
  if (!token)
    throw new PublicBookingError(
      "AUTH_REQUIRED",
      "Administrator access required.",
    );
  const [row] = await transaction
    .select({ role: users.role })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(
      and(
        eq(sessions.tokenHash, hashToken(token)),
        isNull(sessions.revokedAt),
        gt(sessions.expiresAt, new Date()),
      ),
    )
    .limit(1);
  if (!row || row.role !== "admin")
    throw new PublicBookingError(
      "CUSTOMER_REQUIRED",
      "Administrator access required.",
    );
}

function splitTravellerName(value: string) {
  const parts = value.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0]!, lastName: "" };
  const lastName = parts.pop()!;
  return { firstName: parts.join(" "), lastName };
}

function generateCheckoutReference() {
  return `CHK-${new Date().getUTCFullYear()}-${randomBytes(12).toString("hex").toUpperCase()}`;
}

function checkoutPublic(row: {
  checkoutReference: string;
  packageSlug: string;
  packageTitle: string;
  tierName: string;
  departureDate: string;
  travellers: number;
  unitPriceSnapshot: string;
  subtotal: string;
  vatEnabledSnapshot: boolean;
  vatPercentageSnapshot: string;
  vatAmount: string;
  grandTotal: string;
  minimumDepositPercentageSnapshot: string;
  minimumDepositAmount: string;
  currency: string;
  selectedPaymentOption: "minimum" | "full";
  expiresAt: Date;
}) {
  const grandTotal = Number(row.grandTotal);
  const selectedPaymentAmount =
    row.selectedPaymentOption === "full"
      ? grandTotal
      : Number(row.minimumDepositAmount);
  return {
    reference: row.checkoutReference,
    packageSlug: row.packageSlug,
    packageTitle: row.packageTitle,
    tierName: row.tierName,
    departureDate: nepalDate(row.departureDate),
    travellers: row.travellers,
    unitPrice: Number(row.unitPriceSnapshot),
    subtotal: Number(row.subtotal),
    vatEnabled: row.vatEnabledSnapshot,
    vatPercentage: Number(row.vatPercentageSnapshot),
    vatAmount: Number(row.vatAmount),
    grandTotal: Number(row.grandTotal),
    minimumDepositPercentage: Number(row.minimumDepositPercentageSnapshot),
    minimumDepositAmount: Number(row.minimumDepositAmount),
    currency: row.currency,
    selectedPaymentOption: row.selectedPaymentOption,
    selectedPaymentAmount,
    remainingAmount: Number((grandTotal - selectedPaymentAmount).toFixed(2)),
    dueDate:
      row.selectedPaymentOption === "full"
        ? null
        : nepalDate(row.departureDate),
    expiresAt: row.expiresAt.toISOString(),
  };
}

export async function createCheckoutIntent(input: CreateCheckoutIntentInput) {
  let configuration;
  try {
    configuration = await getBookingCommercialConfiguration();
  } catch (error) {
    console.error("Booking commercial configuration is invalid", error);
    throw new PublicBookingError(
      "CONFIGURATION_ERROR",
      "Checkout pricing is temporarily unavailable. Please contact Nepal Heaven.",
    );
  }
  let storedDocument: Awaited<
    ReturnType<typeof storePrivateIdentityDocument>
  > | null = null;
  if (input.document) {
    try {
      storedDocument = await storePrivateIdentityDocument(input.document);
    } catch (error) {
      if (error instanceof PrivateDocumentValidationError)
        throw new PublicBookingError("DOCUMENT_INVALID", error.message);
      throw error;
    }
  }
  const database = requireDb();
  try {
    return await database.transaction(async (transaction) => {
      const userId = await requireAuthenticatedCustomer(transaction);
      const [customer] = await transaction
        .select({
          name: users.name,
          email: users.email,
          phone: users.phone,
          nationality: users.nationality,
          dateOfBirth: users.dateOfBirth,
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      if (!customer?.phone || !customer.nationality || !customer.dateOfBirth)
        throw new PublicBookingError(
          "PROFILE_INCOMPLETE",
          "Your customer profile must include contact number, nationality and date of birth before checkout.",
        );
      const [packageRow] = await transaction
        .select({
          id: packages.id,
          slug: packages.slug,
          title: packages.title,
          cancellationFeeType: packages.cancellationFeeType,
          cancellationFeeValue: packages.cancellationFeeValue,
          cancellationPolicyText: packages.cancellationPolicyText,
          cancellationFeePercentage: packages.cancellationFeePercentage,
          destinationCancellationFeePercentage:
            destinations.cancellationFeePercentage,
        })
        .from(packages)
        .leftJoin(destinations, eq(packages.destinationId, destinations.id))
        .where(
          and(eq(packages.slug, input.packageSlug), eq(packages.status, true)),
        )
        .limit(1);
      if (!packageRow)
        throw new PublicBookingError(
          "PACKAGE_UNAVAILABLE",
          "The selected package is no longer available.",
        );
      const [tier] = await transaction
        .select({
          id: packageTiers.id,
          name: packageTiers.name,
          price: packageTiers.price,
          currency: packageTiers.currency,
        })
        .from(packageTiers)
        .where(
          and(
            eq(packageTiers.packageId, packageRow.id),
            eq(packageTiers.name, input.tierName),
          ),
        )
        .limit(1);
      if (!tier)
        throw new PublicBookingError(
          "TIER_INVALID",
          "The selected package tier is not available for this trip.",
        );
      const amounts = calculateCommercialAmounts(
        tier.price,
        input.travellers,
        configuration,
      );
      const traveller = splitTravellerName(customer.name);
      const cancellationPolicy =
        packageRow.cancellationFeeType !== null &&
        packageRow.cancellationFeeValue !== null
          ? {
              type: packageRow.cancellationFeeType,
              value: packageRow.cancellationFeeValue,
              text: packageRow.cancellationPolicyText,
              source: "package",
            }
          : packageRow.cancellationFeePercentage !== null
            ? {
                type: "percentage" as const,
                value: packageRow.cancellationFeePercentage,
                text: packageRow.cancellationPolicyText,
                source: "package",
              }
            : packageRow.destinationCancellationFeePercentage !== null
              ? {
                  type: "percentage" as const,
                  value: packageRow.destinationCancellationFeePercentage,
                  text: null,
                  source: "destination",
                }
              : {
                  type: "percentage" as const,
                  value:
                    configuration.defaultCancellationFeePercentage.toFixed(2),
                  text: null,
                  source: "global",
                };
      const intentId = randomUUID();
      await transaction.insert(bookingIntents).values({
        id: intentId,
        checkoutReference: generateCheckoutReference(),
        userId,
        packageId: packageRow.id,
        packageTierId: tier.id,
        departureDate: input.departureDate,
        travellers: input.travellers,
        primaryTravellerFirstName: traveller.firstName,
        primaryTravellerLastName: traveller.lastName,
        primaryTravellerEmail: customer.email,
        primaryTravellerPhone: customer.phone,
        primaryTravellerNationality: customer.nationality,
        primaryTravellerDateOfBirth: customer.dateOfBirth,
        notes: input.notes?.trim() || null,
        unitPriceSnapshot: centsToMoney(amounts.unitPriceCents),
        subtotal: centsToMoney(amounts.subtotalCents),
        vatEnabledSnapshot: configuration.vatEnabled,
        vatPercentageSnapshot: configuration.vatPercentage.toFixed(2),
        vatAmount: centsToMoney(amounts.vatAmountCents),
        grandTotal: centsToMoney(amounts.grandTotalCents),
        minimumDepositPercentageSnapshot:
          configuration.minimumDepositPercentage.toFixed(2),
        minimumDepositAmount: centsToMoney(amounts.minimumDepositCents),
        balanceDueDaysSnapshot: configuration.balanceDueDaysBeforeDeparture,
        cancellationFeePercentageSnapshot:
          cancellationPolicy.type === "percentage"
            ? cancellationPolicy.value
            : "0.00",
        cancellationFeeTypeSnapshot: cancellationPolicy.type,
        cancellationFeeValueSnapshot: cancellationPolicy.value,
        cancellationPolicyTextSnapshot: cancellationPolicy.text,
        cancellationPolicySourceSnapshot: cancellationPolicy.source,
        stagedDocumentType: storedDocument ? input.documentType : null,
        stagedDocumentStorageKey: storedDocument?.storageKey ?? null,
        stagedDocumentOriginalFilename:
          storedDocument?.originalFilename ?? null,
        stagedDocumentMimeType: storedDocument?.mimeType ?? null,
        stagedDocumentFileSize: storedDocument?.fileSize ?? null,
        currency: tier.currency,
        selectedPaymentOption: "minimum",
        status: "open",
        expiresAt: new Date(Date.now() + CHECKOUT_LIFETIME_MS),
      });
      const [intent] = await transaction
        .select()
        .from(bookingIntents)
        .where(eq(bookingIntents.id, intentId))
        .limit(1);
      if (!intent) throw new Error("Checkout intent could not be read back.");
      return checkoutPublic({
        ...intent,
        packageSlug: packageRow.slug,
        packageTitle: packageRow.title,
        tierName: tier.name,
      });
    });
  } catch (error) {
    if (storedDocument)
      await deletePrivateIdentityDocument(storedDocument.storageKey);
    throw error;
  }
}

async function ownedOpenCheckout(reference: string, transaction: Transaction) {
  const userId = await requireAuthenticatedCustomer(transaction);
  const [row] = await transaction
    .select({
      checkoutReference: bookingIntents.checkoutReference,
      packageSlug: packages.slug,
      packageTitle: packages.title,
      tierName: packageTiers.name,
      departureDate: bookingIntents.departureDate,
      travellers: bookingIntents.travellers,
      unitPriceSnapshot: bookingIntents.unitPriceSnapshot,
      subtotal: bookingIntents.subtotal,
      vatEnabledSnapshot: bookingIntents.vatEnabledSnapshot,
      vatPercentageSnapshot: bookingIntents.vatPercentageSnapshot,
      vatAmount: bookingIntents.vatAmount,
      grandTotal: bookingIntents.grandTotal,
      minimumDepositPercentageSnapshot:
        bookingIntents.minimumDepositPercentageSnapshot,
      minimumDepositAmount: bookingIntents.minimumDepositAmount,
      currency: bookingIntents.currency,
      selectedPaymentOption: bookingIntents.selectedPaymentOption,
      expiresAt: bookingIntents.expiresAt,
    })
    .from(bookingIntents)
    .innerJoin(packages, eq(bookingIntents.packageId, packages.id))
    .innerJoin(packageTiers, eq(bookingIntents.packageTierId, packageTiers.id))
    .where(
      and(
        eq(bookingIntents.checkoutReference, reference),
        eq(bookingIntents.userId, userId),
        eq(bookingIntents.status, "open"),
        gt(bookingIntents.expiresAt, new Date()),
      ),
    )
    .limit(1);
  if (!row)
    throw new PublicBookingError(
      "CHECKOUT_NOT_FOUND",
      "This checkout is unavailable or has expired.",
    );
  return { row, userId };
}

export async function getMyCheckoutIntent(reference: string) {
  return requireDb().transaction(async (transaction) => {
    const { row } = await ownedOpenCheckout(reference, transaction);
    return checkoutPublic(row);
  });
}

export async function selectCheckoutPaymentOption(
  reference: string,
  option: "minimum" | "full",
) {
  return requireDb().transaction(async (transaction) => {
    const { row, userId } = await ownedOpenCheckout(reference, transaction);
    await transaction
      .update(bookingIntents)
      .set({ selectedPaymentOption: option, updatedAt: new Date() })
      .where(
        and(
          eq(bookingIntents.checkoutReference, reference),
          eq(bookingIntents.userId, userId),
        ),
      );
    return checkoutPublic({ ...row, selectedPaymentOption: option });
  });
}

export async function payCheckoutWithDevelopmentMock(
  reference: string,
  card: import("@/lib/payment-provider.server").MockCardInput,
) {
  const { row, userId } = await requireDb().transaction((transaction) =>
    ownedOpenCheckout(reference, transaction),
  );
  const amount =
    row.selectedPaymentOption === "full"
      ? row.grandTotal
      : row.minimumDepositAmount;
  try {
    const { chargeDevelopmentMockCard } =
      await import("@/lib/payment-provider.server");
    const verifiedPayment = await chargeDevelopmentMockCard(
      card,
      amount,
      row.currency,
    );
    const { finalizeBookingAfterVerifiedPayment } =
      await import("@/lib/booking-finalization.server");
    return await finalizeBookingAfterVerifiedPayment(reference, {
      ...verifiedPayment,
      expectedCustomerId: userId,
    });
  } catch (error) {
    const { PaymentProviderError } =
      await import("@/lib/payment-provider.server");
    if (error instanceof PaymentProviderError)
      throw new PublicBookingError("PAYMENT_FAILED", error.message);
    throw error;
  }
}

export type CustomerPaymentState =
  "partially_paid" | "paid" | "partially_refunded" | "refunded";

export type CustomerRefundState =
  | "none"
  | "processed_for_refund"
  | "partially_refunded"
  | "refunded"
  | "refund_failed"
  | "no_refund_due";

function paymentSummary(
  paymentRows: Array<{
    amount: string;
    status: "pending" | "processing" | "paid" | "failed" | "refunded";
    purpose: "deposit" | "full" | "balance" | "additional" | "refund" | null;
  }>,
  grandTotalCents: number,
) {
  let successfulCents = 0;
  let refundedCents = 0;
  for (const payment of paymentRows) {
    const cents = moneyToCents(payment.amount);
    if (payment.status === "paid" && payment.purpose !== "refund")
      successfulCents += cents;
    if (
      payment.status === "refunded" ||
      (payment.status === "paid" && payment.purpose === "refund")
    )
      refundedCents += cents;
  }
  const netPaidCents = Math.max(successfulCents - refundedCents, 0);
  let status: CustomerPaymentState;
  if (refundedCents > 0)
    status = netPaidCents === 0 ? "refunded" : "partially_refunded";
  else status = netPaidCents >= grandTotalCents ? "paid" : "partially_paid";
  return {
    successfulPaidCents: successfulCents,
    refundedCents,
    amountPaidCents: netPaidCents,
    remainingBalanceCents: Math.max(grandTotalCents - netPaidCents, 0),
    status,
  };
}

const publicBookingSelection = {
  id: bookings.id,
  reference: bookings.bookingReference,
  packageSlug: packages.slug,
  packageTitle: packages.title,
  packageImage: packages.heroImage,
  packageDays: packages.days,
  packageDifficulty: packages.difficulty,
  tierName: packageTiers.name,
  travellers: bookings.travellers,
  departureDate: bookings.departureDate,
  unitPriceSnapshot: bookings.unitPriceSnapshot,
  subtotal: bookings.subtotal,
  vatPercentageSnapshot: bookings.vatPercentageSnapshot,
  vatAmountSnapshot: bookings.vatAmountSnapshot,
  total: bookings.total,
  minimumDepositPercentageSnapshot: bookings.minimumDepositPercentageSnapshot,
  minimumDepositAmountSnapshot: bookings.minimumDepositAmountSnapshot,
  initialPaymentOption: bookings.initialPaymentOption,
  initialPaymentPercentageSnapshot: bookings.initialPaymentPercentageSnapshot,
  amountInitiallyPaid: bookings.amountInitiallyPaid,
  remainingBalanceSnapshot: bookings.remainingBalanceSnapshot,
  balanceDueDate: bookings.balanceDueDate,
  cancellationFeePercentageSnapshot: bookings.cancellationFeePercentageSnapshot,
  cancellationFeeTypeSnapshot: bookings.cancellationFeeTypeSnapshot,
  cancellationFeeValueSnapshot: bookings.cancellationFeeValueSnapshot,
  cancellationPolicyTextSnapshot: bookings.cancellationPolicyTextSnapshot,
  cancellationPolicySourceSnapshot: bookings.cancellationPolicySourceSnapshot,
  cancellationFeeAmount: bookings.cancellationFeeAmount,
  refundAmount: bookings.refundAmount,
  amountPaidAtCancellationSnapshot: bookings.amountPaidAtCancellationSnapshot,
  previouslyRefundedAmountSnapshot: bookings.previouslyRefundedAmountSnapshot,
  refundProcessingDeadline: bookings.refundProcessingDeadline,
  cancelledAt: bookings.cancelledAt,
  cancellationReason: bookings.cancellationReason,
  currency: bookings.currency,
  status: bookings.status,
  notes: bookings.notes,
  createdAt: bookings.createdAt,
};

async function paymentRowsByBooking(transaction: Transaction, ids: string[]) {
  if (!ids.length)
    return new Map<string, Array<typeof payments.$inferSelect>>();
  const rows = await transaction
    .select()
    .from(payments)
    .where(inArray(payments.bookingId, ids))
    .orderBy(asc(payments.createdAt), asc(payments.id));
  const grouped = new Map<string, Array<typeof payments.$inferSelect>>();
  for (const row of rows) {
    const items = grouped.get(row.bookingId) ?? [];
    items.push(row);
    grouped.set(row.bookingId, items);
  }
  return grouped;
}

type PublicBookingRow = {
  id: string;
  reference: string;
  packageSlug: string;
  packageTitle: string;
  packageImage: string | null;
  packageDays: number | null;
  packageDifficulty: "easy" | "moderate" | "challenging" | "extreme" | null;
  tierName: string | null;
  travellers: number;
  departureDate: string | null;
  unitPriceSnapshot: string | null;
  subtotal: string | null;
  vatPercentageSnapshot: string | null;
  vatAmountSnapshot: string | null;
  total: string | null;
  minimumDepositPercentageSnapshot: string | null;
  minimumDepositAmountSnapshot: string | null;
  initialPaymentOption: "minimum" | "full" | null;
  initialPaymentPercentageSnapshot: string | null;
  amountInitiallyPaid: string | null;
  remainingBalanceSnapshot: string | null;
  balanceDueDate: string | null;
  cancellationFeePercentageSnapshot: string | null;
  cancellationFeeTypeSnapshot: "fixed" | "percentage";
  cancellationFeeValueSnapshot: string;
  cancellationPolicyTextSnapshot: string | null;
  cancellationPolicySourceSnapshot: string | null;
  cancellationFeeAmount: string | null;
  refundAmount: string | null;
  amountPaidAtCancellationSnapshot: string | null;
  previouslyRefundedAmountSnapshot: string | null;
  refundProcessingDeadline: Date | null;
  cancelledAt: Date | null;
  cancellationReason: string | null;
  currency: string;
  status: "pending" | "confirmed" | "cancelled" | "completed";
  notes: string | null;
  createdAt: Date;
};

function publicBooking(
  row: PublicBookingRow,
  paymentRows: Array<typeof payments.$inferSelect>,
) {
  const grandTotalCents = moneyToCents(row.total ?? "0");
  const summary = paymentSummary(paymentRows, grandTotalCents);
  const requestedRefundCents = moneyToCents(row.refundAmount ?? "0");
  const failedRefund = paymentRows.some(
    (payment) => payment.purpose === "refund" && payment.status === "failed",
  );
  let refundStatus: CustomerRefundState = "none";
  if (row.status === "cancelled") {
    if (requestedRefundCents === 0) refundStatus = "no_refund_due";
    else if (summary.refundedCents === 0)
      refundStatus = failedRefund ? "refund_failed" : "processed_for_refund";
    else
      refundStatus =
        summary.refundedCents >= requestedRefundCents
          ? "refunded"
          : "partially_refunded";
  }
  const cancellationFeeCents = calculateCancellationFee(
    grandTotalCents,
    row.cancellationFeeTypeSnapshot,
    row.cancellationFeeValueSnapshot,
  );
  return {
    reference: row.reference,
    packageSlug: row.packageSlug,
    packageTitle: row.packageTitle,
    packageImage: resolveAssetReference(row.packageImage),
    packageDays: row.packageDays ?? 0,
    packageDifficulty: row.packageDifficulty ?? "",
    tierName: row.tierName,
    travellers: row.travellers,
    departureDate: row.departureDate ? nepalDate(row.departureDate) : "",
    unitPrice: Number(row.unitPriceSnapshot ?? 0),
    subtotal: Number(row.subtotal ?? 0),
    vatPercentage: Number(row.vatPercentageSnapshot ?? 0),
    vatAmount: Number(row.vatAmountSnapshot ?? 0),
    total: Number(row.total ?? 0),
    minimumDepositPercentage: Number(row.minimumDepositPercentageSnapshot ?? 0),
    minimumDepositAmount: Number(row.minimumDepositAmountSnapshot ?? 0),
    amountInitiallyPaid: Number(row.amountInitiallyPaid ?? 0),
    initialPaymentOption: row.initialPaymentOption,
    initialPaymentPercentage: Number(row.initialPaymentPercentageSnapshot ?? 0),
    amountPaid: Number(centsToMoney(summary.successfulPaidCents)),
    netAmountRetained: Number(centsToMoney(summary.amountPaidCents)),
    refundedAmount: Number(centsToMoney(summary.refundedCents)),
    remainingBalance:
      row.status === "cancelled"
        ? 0
        : Number(centsToMoney(summary.remainingBalanceCents)),
    outstandingBalanceVoided:
      row.status === "cancelled"
        ? Number(
            centsToMoney(
              Math.max(grandTotalCents - summary.successfulPaidCents, 0),
            ),
          )
        : 0,
    balanceDueDate: row.balanceDueDate ? nepalDate(row.balanceDueDate) : "",
    cancellationFeePercentage: Number(
      row.cancellationFeePercentageSnapshot ?? 0,
    ),
    cancellationFeeType: row.cancellationFeeTypeSnapshot,
    cancellationFeeValue: Number(row.cancellationFeeValueSnapshot),
    cancellationPolicyText: row.cancellationPolicyTextSnapshot,
    estimatedCancellationFee: Number(centsToMoney(cancellationFeeCents)),
    cancellationPolicySource: row.cancellationPolicySourceSnapshot,
    cancellationFeeAmount: Number(row.cancellationFeeAmount ?? 0),
    refundAmount: Number(row.refundAmount ?? 0),
    amountPaidAtCancellation: Number(row.amountPaidAtCancellationSnapshot ?? 0),
    previouslyRefundedAtCancellation: Number(
      row.previouslyRefundedAmountSnapshot ?? 0,
    ),
    refundProcessingDeadline:
      row.refundProcessingDeadline?.toISOString() ?? null,
    cancelledDate: row.cancelledAt?.toISOString() ?? null,
    cancellationReason: row.cancellationReason,
    currency: row.currency,
    status: row.status,
    notes: row.notes,
    createdDate: row.createdAt.toISOString(),
    paymentStatus: summary.status,
    refundStatus,
  };
}

function isQualifyingBooking(
  booking: ReturnType<typeof publicBooking>,
  paymentRows: Array<typeof payments.$inferSelect>,
) {
  if (
    !(["confirmed", "completed", "cancelled"] as string[]).includes(
      booking.status,
    )
  )
    return false;
  const successful = paymentSummary(paymentRows, moneyToCents(booking.total));
  // A later refund changes payment state/balance, not whether the reservation
  // was validly created from a qualifying original successful payment.
  return (
    successful.successfulPaidCents >= moneyToCents(booking.minimumDepositAmount)
  );
}

export async function getMyBookings() {
  return requireDb().transaction(async (transaction) => {
    const userId = await requireAuthenticatedCustomer(transaction);
    const rows = await transaction
      .select(publicBookingSelection)
      .from(bookings)
      .innerJoin(packages, eq(bookings.packageId, packages.id))
      .leftJoin(packageTiers, eq(bookings.packageTierId, packageTiers.id))
      .where(eq(bookings.userId, userId))
      .orderBy(desc(bookings.createdAt), desc(bookings.bookingReference));
    const paymentMap = await paymentRowsByBooking(
      transaction,
      rows.map((row) => row.id),
    );
    return rows.flatMap((row) => {
      const rowPayments = paymentMap.get(row.id) ?? [];
      const mapped = publicBooking(row, rowPayments);
      return isQualifyingBooking(mapped, rowPayments) ? [mapped] : [];
    });
  });
}

export async function getMyBookingByReference(reference: string) {
  return requireDb().transaction(async (transaction) => {
    const userId = await requireAuthenticatedCustomer(transaction);
    const [row] = await transaction
      .select(publicBookingSelection)
      .from(bookings)
      .innerJoin(packages, eq(bookings.packageId, packages.id))
      .leftJoin(packageTiers, eq(bookings.packageTierId, packageTiers.id))
      .where(
        and(
          eq(bookings.bookingReference, reference),
          eq(bookings.userId, userId),
        ),
      )
      .limit(1);
    if (!row)
      throw new PublicBookingError(
        "BOOKING_NOT_FOUND",
        "This booking could not be found for your account.",
      );
    const rowPayments =
      (await paymentRowsByBooking(transaction, [row.id])).get(row.id) ?? [];
    const mapped = publicBooking(row, rowPayments);
    if (!isQualifyingBooking(mapped, rowPayments))
      throw new PublicBookingError(
        "BOOKING_NOT_FOUND",
        "This booking could not be found for your account.",
      );
    const [primaryTraveller] = await transaction
      .select({
        firstName: bookingTravellers.firstName,
        lastName: bookingTravellers.lastName,
        email: bookingTravellers.email,
        phone: bookingTravellers.phone,
        nationality: bookingTravellers.nationality,
        dateOfBirth: bookingTravellers.dateOfBirth,
      })
      .from(bookingTravellers)
      .where(eq(bookingTravellers.bookingId, row.id))
      .orderBy(asc(bookingTravellers.id))
      .limit(1);
    const [customerProfile] = await transaction
      .select({
        name: users.name,
        email: users.email,
        phone: users.phone,
        nationality: users.nationality,
        dateOfBirth: users.dateOfBirth,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    return {
      ...mapped,
      customerProfile: customerProfile
        ? {
            ...customerProfile,
            dateOfBirth: customerProfile.dateOfBirth
              ? String(customerProfile.dateOfBirth).slice(0, 10)
              : null,
          }
        : null,
      primaryTraveller: primaryTraveller
        ? {
            ...primaryTraveller,
            dateOfBirth: primaryTraveller.dateOfBirth ?? null,
          }
        : null,
      paymentHistory: rowPayments.map((payment) => ({
        purpose: payment.purpose,
        amount: Number(payment.amount),
        currency: payment.currency,
        provider: payment.provider,
        reference: payment.providerTransactionId,
        status: payment.status,
        paidAt: payment.paidAt?.toISOString() ?? null,
        createdDate: payment.createdAt.toISOString(),
      })),
      identityDocument: await transaction
        .select({
          id: bookingIdentityDocuments.id,
          documentType: bookingIdentityDocuments.documentType,
          originalFilename: bookingIdentityDocuments.originalFilename,
          verificationStatus: bookingIdentityDocuments.verificationStatus,
          createdAt: bookingIdentityDocuments.createdAt,
        })
        .from(bookingIdentityDocuments)
        .where(
          and(
            eq(bookingIdentityDocuments.bookingId, row.id),
            eq(bookingIdentityDocuments.userId, userId),
          ),
        )
        .limit(1)
        .then((items) =>
          items[0]
            ? {
                ...items[0],
                uploadedAt: items[0].createdAt.toISOString(),
                createdAt: undefined,
              }
            : null,
        ),
    };
  });
}

export async function getCustomerBookingSummary(reference: string) {
  const row = await getMyBookingByReference(reference);
  return {
    reference: row.reference,
    packageSlug: row.packageSlug,
    packageTitle: row.packageTitle,
    tierName: row.tierName,
    travellers: row.travellers,
    departureDate: row.departureDate,
    subtotal: row.subtotal,
    total: row.total,
    currency: row.currency,
    status: row.status,
    paymentOption: row.initialPaymentOption,
    initialPaymentPercentage: row.initialPaymentPercentage,
    amountPaid: row.amountPaid,
    remainingBalance: row.remainingBalance,
    balanceDueDate: row.balanceDueDate,
    paymentStatus: row.paymentStatus,
  };
}

export async function getAdminConfirmedBooking(reference: string) {
  return requireDb().transaction(async (transaction) => {
    await requireAuthenticatedAdmin(transaction);
    const [row] = await transaction
      .select({
        id: bookings.id,
        reference: bookings.bookingReference,
        status: bookings.status,
        confirmedAt: bookings.createdAt,
        userId: bookings.userId,
        customerName: users.name,
        customerEmail: users.email,
        customerPhone: users.phone,
        customerCountry: users.country,
        customerNationality: users.nationality,
        packageName: packages.title,
        tierName: packageTiers.name,
        destinationName: destinations.name,
        departureDate: bookings.departureDate,
        travellers: bookings.travellers,
        paymentOption: bookings.initialPaymentOption,
        grandTotal: bookings.total,
        amountPaid: bookings.amountInitiallyPaid,
        remainingBalance: bookings.remainingBalanceSnapshot,
        currency: bookings.currency,
      })
      .from(bookings)
      .innerJoin(users, eq(users.id, bookings.userId))
      .innerJoin(packages, eq(packages.id, bookings.packageId))
      .leftJoin(packageTiers, eq(packageTiers.id, bookings.packageTierId))
      .leftJoin(destinations, eq(destinations.id, packages.destinationId))
      .where(
        and(
          eq(bookings.bookingReference, reference),
          eq(bookings.status, "confirmed"),
        ),
      )
      .limit(1);
    if (!row)
      throw new PublicBookingError(
        "BOOKING_NOT_FOUND",
        "Confirmed booking not found.",
      );
    const [[traveller], [payment]] = await Promise.all([
      transaction
        .select()
        .from(bookingTravellers)
        .where(eq(bookingTravellers.bookingId, row.id))
        .limit(1),
      transaction
        .select()
        .from(payments)
        .where(and(eq(payments.bookingId, row.id), eq(payments.status, "paid")))
        .orderBy(asc(payments.createdAt))
        .limit(1),
    ]);
    if (!payment)
      throw new PublicBookingError(
        "BOOKING_NOT_FOUND",
        "Confirmed booking payment not found.",
      );
    const {
      getBookingPaymentStatusLabel,
      getBookingPaymentTypeLabel,
      getPaymentMethodLabel,
    } = await import("@/lib/booking-email.server");
    return {
      ...row,
      customerName: traveller
        ? `${traveller.firstName} ${traveller.lastName}`.trim()
        : row.customerName,
      customerEmail: traveller?.email || row.customerEmail,
      customerPhone: traveller?.phone || row.customerPhone,
      customerNationality:
        traveller?.nationality ||
        row.customerNationality ||
        row.customerCountry,
      confirmedAt: (payment.paidAt || row.confirmedAt).toISOString(),
      departureDate: row.departureDate ? nepalDate(row.departureDate) : null,
      paymentType: getBookingPaymentTypeLabel(
        row.paymentOption,
        payment.purpose,
      ),
      paymentMethod: getPaymentMethodLabel(payment.provider),
      paymentStatus: getBookingPaymentStatusLabel(row.remainingBalance),
      paymentReference: payment.providerTransactionId,
    };
  });
}

export async function getAdminCancelledBooking(reference: string) {
  return requireDb().transaction(async (transaction) => {
    await requireAuthenticatedAdmin(transaction);
    const [row] = await transaction
      .select({
        id: bookings.id,
        reference: bookings.bookingReference,
        cancelledAt: bookings.cancelledAt,
        cancellationReason: bookings.cancellationReason,
        customerName: users.name,
        customerEmail: users.email,
        customerPhone: users.phone,
        customerCountry: users.country,
        customerNationality: users.nationality,
        packageName: packages.title,
        tierName: packageTiers.name,
        destinationName: destinations.name,
        departureDate: bookings.departureDate,
        travellers: bookings.travellers,
        grandTotal: bookings.total,
        amountPaid: bookings.amountPaidAtCancellationSnapshot,
        previouslyRefunded: bookings.previouslyRefundedAmountSnapshot,
        cancellationFeeType: bookings.cancellationFeeTypeSnapshot,
        cancellationFeeValue: bookings.cancellationFeeValueSnapshot,
        cancellationFeeAmount: bookings.cancellationFeeAmount,
        refundDue: bookings.refundAmount,
        refundDeadline: bookings.refundProcessingDeadline,
        currency: bookings.currency,
      })
      .from(bookings)
      .innerJoin(users, eq(users.id, bookings.userId))
      .innerJoin(packages, eq(packages.id, bookings.packageId))
      .leftJoin(packageTiers, eq(packageTiers.id, bookings.packageTierId))
      .leftJoin(destinations, eq(destinations.id, packages.destinationId))
      .where(
        and(
          eq(bookings.bookingReference, reference),
          eq(bookings.status, "cancelled"),
        ),
      )
      .limit(1);
    if (!row?.cancelledAt)
      throw new PublicBookingError(
        "BOOKING_NOT_FOUND",
        "Cancelled booking not found.",
      );
    const [[traveller], paymentRows] = await Promise.all([
      transaction
        .select()
        .from(bookingTravellers)
        .where(eq(bookingTravellers.bookingId, row.id))
        .orderBy(asc(bookingTravellers.id))
        .limit(1),
      transaction
        .select()
        .from(payments)
        .where(eq(payments.bookingId, row.id))
        .orderBy(asc(payments.createdAt)),
    ]);
    const refundDueCents = moneyToCents(row.refundDue ?? "0");
    const summary = paymentSummary(
      paymentRows,
      moneyToCents(row.grandTotal ?? "0"),
    );
    const hasFailedRefund = paymentRows.some(
      (payment) => payment.purpose === "refund" && payment.status === "failed",
    );
    const refundStatus: CustomerRefundState =
      refundDueCents === 0
        ? "no_refund_due"
        : hasFailedRefund && summary.refundedCents === 0
          ? "refund_failed"
          : summary.refundedCents >= refundDueCents
            ? "refunded"
            : summary.refundedCents > 0
              ? "partially_refunded"
              : "processed_for_refund";
    return {
      ...row,
      customerName: traveller
        ? `${traveller.firstName} ${traveller.lastName}`.trim()
        : row.customerName,
      customerEmail: traveller?.email || row.customerEmail,
      customerPhone: traveller?.phone || row.customerPhone,
      customerNationality:
        traveller?.nationality ||
        row.customerNationality ||
        row.customerCountry,
      departureDate: row.departureDate ? nepalDate(row.departureDate) : null,
      cancelledAt: row.cancelledAt.toISOString(),
      refundDeadline: row.refundDeadline?.toISOString() ?? null,
      refundStatus,
      paymentReferences: paymentRows
        .filter((payment) => payment.purpose !== "refund")
        .map((payment) => payment.providerTransactionId)
        .filter((value): value is string => Boolean(value)),
    };
  });
}

export async function getMyConfirmedBookingForPackage(packageSlug: string) {
  try {
    const customerBookings = await getMyBookings();
    const match = customerBookings.find(
      (booking) =>
        booking.packageSlug === packageSlug && booking.status === "confirmed",
    );
    return match
      ? {
          reference: match.reference,
          departureDate: match.departureDate,
          status: match.status,
        }
      : null;
  } catch (error) {
    if (
      error instanceof PublicBookingError &&
      (error.code === "AUTH_REQUIRED" || error.code === "CUSTOMER_REQUIRED")
    )
      return null;
    throw error;
  }
}

export async function getMyCancellationPreview(reference: string) {
  const userId = await requireDb().transaction((transaction) =>
    requireAuthenticatedCustomer(transaction),
  );
  try {
    const { getCancellationPreviewOwnedByCustomer } =
      await import("@/lib/booking-cancellation.server");
    return await getCancellationPreviewOwnedByCustomer(reference, userId);
  } catch (error) {
    const { BookingCancellationError } =
      await import("@/lib/booking-cancellation.server");
    if (error instanceof BookingCancellationError)
      throw new PublicBookingError(error.code, error.message);
    throw error;
  }
}

export async function cancelMyBooking(reference: string, reason?: string) {
  const userId = await requireDb().transaction((transaction) =>
    requireAuthenticatedCustomer(transaction),
  );
  try {
    const { cancelBookingOwnedByCustomer } =
      await import("@/lib/booking-cancellation.server");
    return await cancelBookingOwnedByCustomer(reference, userId, reason);
  } catch (error) {
    const { BookingCancellationError } =
      await import("@/lib/booking-cancellation.server");
    if (error instanceof BookingCancellationError)
      throw new PublicBookingError(error.code, error.message);
    throw error;
  }
}

export async function completeDevelopmentMockRefund(reference: string) {
  return requireDb().transaction(async (transaction) => {
    await requireAuthenticatedAdmin(transaction);
    const [booking] = await transaction
      .select({
        id: bookings.id,
        status: bookings.status,
        requestedRefund: bookings.refundAmount,
        currency: bookings.currency,
      })
      .from(bookings)
      .where(eq(bookings.bookingReference, reference))
      .limit(1)
      .for("update");
    if (!booking || booking.status !== "cancelled")
      throw new PublicBookingError(
        "BOOKING_NOT_FOUND",
        "A cancelled booking could not be found.",
      );
    const requestedCents = moneyToCents(booking.requestedRefund ?? "0");
    const rows = await transaction
      .select()
      .from(payments)
      .where(eq(payments.bookingId, booking.id));
    const summary = paymentSummary(rows, requestedCents);
    const remainingCents = Math.max(requestedCents - summary.refundedCents, 0);
    if (remainingCents === 0)
      return {
        status:
          requestedCents === 0
            ? ("no_refund_due" as const)
            : summary.refundedCents >= requestedCents
              ? ("refunded" as const)
              : ("partially_refunded" as const),
        refundedAmount: Number(centsToMoney(summary.refundedCents)),
        reference: null,
      };
    const { refundDevelopmentMockPayment } =
      await import("@/lib/payment-provider.server");
    const refund = await refundDevelopmentMockPayment(
      centsToMoney(remainingCents),
      booking.currency,
    );
    await transaction.insert(payments).values({
      bookingId: booking.id,
      purpose: "refund",
      amount: refund.amount,
      currency: refund.currency,
      provider: refund.provider,
      providerTransactionId: refund.providerTransactionId,
      status: "refunded",
      verifiedAt: refund.verifiedAt,
      paidAt: refund.verifiedAt,
      metadata: JSON.stringify({ type: "development_mock_refund_completion" }),
    });
    const refundedCents = summary.refundedCents + remainingCents;
    return {
      status:
        refundedCents >= requestedCents
          ? ("refunded" as const)
          : ("partially_refunded" as const),
      refundedAmount: Number(centsToMoney(refundedCents)),
      reference: refund.providerTransactionId,
    };
  });
}

export async function uploadMyBookingIdentityDocument(
  reference: string,
  documentType: "passport" | "national_id",
  file: File,
) {
  let stored: Awaited<ReturnType<typeof storePrivateIdentityDocument>>;
  try {
    stored = await storePrivateIdentityDocument(file);
  } catch (error) {
    if (error instanceof PrivateDocumentValidationError)
      throw new PublicBookingError("DOCUMENT_INVALID", error.message);
    throw error;
  }
  let replacedStorageKey: string | null = null;
  try {
    const result = await requireDb().transaction(async (transaction) => {
      const userId = await requireAuthenticatedCustomer(transaction);
      const [booking] = await transaction
        .select({ id: bookings.id, status: bookings.status })
        .from(bookings)
        .where(
          and(
            eq(bookings.bookingReference, reference),
            eq(bookings.userId, userId),
          ),
        )
        .limit(1);
      if (
        !booking ||
        !["confirmed", "cancelled", "completed"].includes(booking.status)
      )
        throw new PublicBookingError(
          "BOOKING_NOT_FOUND",
          "This booking could not be found for your account.",
        );
      const [existing] = await transaction
        .select({
          id: bookingIdentityDocuments.id,
          storageKey: bookingIdentityDocuments.storageKey,
          verificationStatus: bookingIdentityDocuments.verificationStatus,
        })
        .from(bookingIdentityDocuments)
        .where(eq(bookingIdentityDocuments.bookingId, booking.id))
        .limit(1);
      if (existing && existing.verificationStatus !== "rejected")
        throw new PublicBookingError(
          "DOCUMENT_INVALID",
          "A passport or ID is already attached to this booking.",
        );
      const values = {
        bookingId: booking.id,
        userId,
        documentType,
        storageKey: stored.storageKey,
        originalFilename: stored.originalFilename,
        mimeType: stored.mimeType,
        fileSize: stored.fileSize,
        verificationStatus: "pending" as const,
        updatedAt: new Date(),
      };
      if (existing) replacedStorageKey = existing.storageKey;
      const documentId = existing?.id ?? randomUUID();
      if (existing) {
        await transaction
          .update(bookingIdentityDocuments)
          .set(values)
          .where(eq(bookingIdentityDocuments.id, existing.id));
      } else {
        await transaction.insert(bookingIdentityDocuments).values({
          id: documentId,
          ...values,
        });
      }
      return {
        id: documentId,
        documentType,
        originalFilename: stored.originalFilename,
        verificationStatus: "pending" as const,
      };
    });
    if (replacedStorageKey)
      await deletePrivateIdentityDocument(replacedStorageKey);
    return result;
  } catch (error) {
    await deletePrivateIdentityDocument(stored.storageKey);
    throw error;
  }
}

export function isPublicBookingError(
  error: unknown,
): error is PublicBookingError {
  return error instanceof PublicBookingError;
}
