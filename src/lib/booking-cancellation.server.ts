import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { bookings, payments } from "@/db/schema/bookings";
import {
  calculateCancellationFee,
  calculateRefund,
  centsToMoney,
  moneyToCents,
} from "@/lib/booking-money";

export class BookingCancellationError extends Error {
  constructor(
    public readonly code: "BOOKING_NOT_FOUND" | "CANCELLATION_NOT_ALLOWED",
    message: string,
  ) {
    super(message);
  }
}

type CancellationTransaction = Pick<
  NonNullable<typeof db>,
  "select" | "update"
>;

function nepalToday() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kathmandu",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  return `${values["year"]}-${values["month"]}-${values["day"]}`;
}

function summarizePayments(rows: Array<typeof payments.$inferSelect>) {
  let successfulPaidCents = 0;
  let refundedCents = 0;
  for (const payment of rows) {
    const cents = moneyToCents(payment.amount);
    if (payment.status === "paid" && payment.purpose !== "refund")
      successfulPaidCents += cents;
    if (
      payment.status === "refunded" ||
      (payment.status === "paid" && payment.purpose === "refund")
    )
      refundedCents += cents;
  }
  return {
    successfulPaidCents,
    refundedCents,
    netPaidCents: Math.max(successfulPaidCents - refundedCents, 0),
  };
}

async function cancellationContext(
  transaction: CancellationTransaction,
  reference: string,
  userId: string,
  lock: boolean,
) {
  const query = transaction
    .select({
      id: bookings.id,
      status: bookings.status,
      departureDate: bookings.departureDate,
      total: bookings.total,
      currency: bookings.currency,
      feeType: bookings.cancellationFeeTypeSnapshot,
      feeValue: bookings.cancellationFeeValueSnapshot,
    })
    .from(bookings)
    .where(
      and(
        eq(bookings.bookingReference, reference),
        eq(bookings.userId, userId),
      ),
    )
    .limit(1);
  const [booking] = lock ? await query.for("update") : await query;
  if (!booking)
    throw new BookingCancellationError(
      "BOOKING_NOT_FOUND",
      "This booking could not be found for your account.",
    );
  if (booking.status !== "confirmed")
    throw new BookingCancellationError(
      "CANCELLATION_NOT_ALLOWED",
      "Only a confirmed booking can be cancelled.",
    );
  if (!booking.departureDate || booking.departureDate < nepalToday())
    throw new BookingCancellationError(
      "CANCELLATION_NOT_ALLOWED",
      "Self-service cancellation is unavailable after departure.",
    );
  const rows = await transaction
    .select()
    .from(payments)
    .where(eq(payments.bookingId, booking.id));
  const summary = summarizePayments(rows);
  const calculatedFeeCents = calculateCancellationFee(
    moneyToCents(booking.total ?? "0"),
    booking.feeType,
    booking.feeValue,
  );
  const amounts = calculateRefund(summary.netPaidCents, calculatedFeeCents);
  return { booking, summary, ...amounts };
}

function publicResult(
  context: Awaited<ReturnType<typeof cancellationContext>>,
) {
  const totalCents = moneyToCents(context.booking.total ?? "0");
  return {
    grandTotal: Number(context.booking.total ?? 0),
    amountPaid: Number(centsToMoney(context.summary.successfulPaidCents)),
    cancellationFeeType: context.booking.feeType,
    cancellationFeeValue: Number(context.booking.feeValue),
    cancellationFeeAmount: Number(
      centsToMoney(context.cancellationFeeChargedCents),
    ),
    refundAmount: Number(centsToMoney(context.refundDueCents)),
    outstandingBalanceVoided: Number(
      centsToMoney(
        Math.max(totalCents - context.summary.successfulPaidCents, 0),
      ),
    ),
    currency: context.booking.currency,
  };
}

export async function getCancellationPreviewOwnedByCustomer(
  reference: string,
  userId: string,
) {
  if (!db) throw new Error("Database is unavailable.");
  return db.transaction(async (transaction) =>
    publicResult(
      await cancellationContext(transaction, reference, userId, false),
    ),
  );
}

export async function cancelBookingOwnedByCustomer(
  reference: string,
  userId: string,
  reason?: string,
) {
  if (!db) throw new Error("Database is unavailable.");
  const result = await db.transaction(async (transaction) => {
    const context = await cancellationContext(
      transaction,
      reference,
      userId,
      true,
    );
    const now = new Date();
    const refundProcessingDeadline =
      context.refundDueCents > 0
        ? new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000)
        : null;
    await transaction
      .update(bookings)
      .set({
        status: "cancelled",
        cancellationFeeAmount: centsToMoney(
          context.cancellationFeeChargedCents,
        ),
        refundAmount: centsToMoney(context.refundDueCents),
        amountPaidAtCancellationSnapshot: centsToMoney(
          context.summary.successfulPaidCents,
        ),
        previouslyRefundedAmountSnapshot: centsToMoney(
          context.summary.refundedCents,
        ),
        refundProcessingDeadline,
        cancelledAt: now,
        cancellationReason: reason?.trim() || null,
        updatedAt: now,
      })
      .where(eq(bookings.id, context.booking.id));
    return {
      ...publicResult(context),
      bookingId: context.booking.id,
      status: "cancelled" as const,
      cancelledAt: now.toISOString(),
      refundProcessingDeadline: refundProcessingDeadline?.toISOString() ?? null,
      refundStatus:
        context.refundDueCents > 0
          ? ("processed_for_refund" as const)
          : ("no_refund_due" as const),
    };
  });
  const [{ sendBookingCancellationEmails }, { runPostResponseTask }] =
    await Promise.all([
      import("@/lib/booking-email.server"),
      import("@/lib/request-background.server"),
    ]);
  await runPostResponseTask(
    sendBookingCancellationEmails(result.bookingId),
    `Cancellation email dispatch for ${reference}`,
  );
  const { bookingId: _bookingId, ...customerResult } = result;
  return customerResult;
}
