import { randomBytes, randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  bookingIntents,
  bookings,
  bookingTravellers,
  payments,
} from "@/db/schema/bookings";
import { packages, packageTiers } from "@/db/schema/packages";
import { bookingIdentityDocuments } from "@/db/schema/identity-documents";
import {
  calculateBalanceDueDate,
  calculateCommercialAmounts,
  centsToMoney,
  moneyToCents,
} from "@/lib/booking-money";

export type TrustedVerifiedPayment = {
  expectedCustomerId: string;
  status: "succeeded";
  amount: string;
  currency: string;
  provider: string;
  providerTransactionId: string;
  verifiedAt: Date;
  verificationContext: string;
};

export class BookingFinalizationError extends Error {
  constructor(
    public readonly code:
      | "CHECKOUT_INVALID"
      | "OWNERSHIP_MISMATCH"
      | "PACKAGE_INVALID"
      | "PAYMENT_INVALID"
      | "PAYMENT_BELOW_MINIMUM",
    message: string,
  ) {
    super(message);
  }
}

function generateBookingReference() {
  return `NH-${new Date().getUTCFullYear()}-${randomBytes(8).toString("hex").toUpperCase()}`;
}

function sameMoney(left: string, right: string) {
  return moneyToCents(left) === moneyToCents(right);
}

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

/**
 * Server-internal finalization boundary. This function is deliberately not
 * exposed by any createServerFn. A future verified provider adapter/webhook is
 * the only production caller; controlled service tests may call it directly.
 */
export async function finalizeBookingAfterVerifiedPayment(
  checkoutReference: string,
  verifiedPayment: TrustedVerifiedPayment,
) {
  if (!db) throw new Error("Database is not configured.");
  if (
    verifiedPayment.status !== "succeeded" ||
    verifiedPayment.provider.trim().length < 2 ||
    verifiedPayment.providerTransactionId.trim().length < 6 ||
    verifiedPayment.verificationContext.trim().length < 6 ||
    Number.isNaN(verifiedPayment.verifiedAt.getTime())
  )
    throw new BookingFinalizationError(
      "PAYMENT_INVALID",
      "Trusted payment verification evidence is incomplete.",
    );

  const finalizedBooking = await db.transaction(async (transaction) => {
    const [intent] = await transaction
      .select()
      .from(bookingIntents)
      .where(eq(bookingIntents.checkoutReference, checkoutReference))
      .limit(1)
      .for("update");
    if (!intent)
      throw new BookingFinalizationError(
        "CHECKOUT_INVALID",
        "Checkout intent does not exist.",
      );

    if (intent.status === "consumed") {
      const [existing] = await transaction
        .select({
          id: bookings.id,
          reference: bookings.bookingReference,
          status: bookings.status,
          total: bookings.total,
          currency: bookings.currency,
        })
        .from(bookings)
        .innerJoin(payments, eq(payments.bookingId, bookings.id))
        .where(
          and(
            eq(bookings.checkoutIntentId, intent.id),
            eq(payments.provider, verifiedPayment.provider),
            eq(
              payments.providerTransactionId,
              verifiedPayment.providerTransactionId,
            ),
          ),
        )
        .limit(1);
      if (existing)
        return {
          ...existing,
          paymentStatus:
            moneyToCents(verifiedPayment.amount) >=
            moneyToCents(existing.total ?? "0")
              ? ("paid" as const)
              : ("partially_paid" as const),
        };
      throw new BookingFinalizationError(
        "CHECKOUT_INVALID",
        "Checkout intent has already been consumed.",
      );
    }
    if (intent.status !== "open" || intent.expiresAt <= new Date())
      throw new BookingFinalizationError(
        "CHECKOUT_INVALID",
        "Checkout intent is no longer valid.",
      );
    if (intent.userId !== verifiedPayment.expectedCustomerId)
      throw new BookingFinalizationError(
        "OWNERSHIP_MISMATCH",
        "Verified payment customer does not own this checkout.",
      );

    const [packageTier] = await transaction
      .select({
        packageId: packages.id,
        packageActive: packages.status,
        tierId: packageTiers.id,
        tierPrice: packageTiers.price,
        tierCurrency: packageTiers.currency,
      })
      .from(packages)
      .innerJoin(packageTiers, eq(packageTiers.packageId, packages.id))
      .where(
        and(
          eq(packages.id, intent.packageId),
          eq(packageTiers.id, intent.packageTierId),
        ),
      )
      .limit(1);
    if (
      !packageTier ||
      !packageTier.packageActive ||
      !sameMoney(packageTier.tierPrice, intent.unitPriceSnapshot) ||
      packageTier.tierCurrency !== intent.currency
    )
      throw new BookingFinalizationError(
        "PACKAGE_INVALID",
        "Package, tier, or authoritative checkout price is no longer valid.",
      );

    const recalculated = calculateCommercialAmounts(
      intent.unitPriceSnapshot,
      intent.travellers,
      {
        vatEnabled: intent.vatEnabledSnapshot,
        vatPercentage: Number(intent.vatPercentageSnapshot),
        minimumDepositPercentage: Number(
          intent.minimumDepositPercentageSnapshot,
        ),
        balanceDueDaysBeforeDeparture: intent.balanceDueDaysSnapshot,
      },
    );
    if (
      !sameMoney(intent.subtotal, centsToMoney(recalculated.subtotalCents)) ||
      !sameMoney(intent.vatAmount, centsToMoney(recalculated.vatAmountCents)) ||
      !sameMoney(
        intent.grandTotal,
        centsToMoney(recalculated.grandTotalCents),
      ) ||
      !sameMoney(
        intent.minimumDepositAmount,
        centsToMoney(recalculated.minimumDepositCents),
      )
    )
      throw new BookingFinalizationError(
        "CHECKOUT_INVALID",
        "Checkout commercial snapshots failed integrity verification.",
      );

    if (verifiedPayment.currency !== intent.currency)
      throw new BookingFinalizationError(
        "PAYMENT_INVALID",
        "Verified payment currency does not match checkout currency.",
      );
    const paidCents = moneyToCents(verifiedPayment.amount);
    if (paidCents < recalculated.minimumDepositCents)
      throw new BookingFinalizationError(
        "PAYMENT_BELOW_MINIMUM",
        "Verified payment is below the required minimum deposit.",
      );
    if (paidCents > recalculated.grandTotalCents)
      throw new BookingFinalizationError(
        "PAYMENT_INVALID",
        "Verified initial payment exceeds the checkout grand total.",
      );
    const expectedPaidCents =
      intent.selectedPaymentOption === "full"
        ? recalculated.grandTotalCents
        : recalculated.minimumDepositCents;
    if (paidCents !== expectedPaidCents)
      throw new BookingFinalizationError(
        "PAYMENT_INVALID",
        "Verified payment does not match the selected payment option.",
      );

    const remainingCents = recalculated.grandTotalCents - paidCents;
    const departureDate = nepalDate(intent.departureDate);
    const balanceDueDate =
      remainingCents > 0 ? calculateBalanceDueDate(departureDate, 0) : null;
    const bookingId = randomUUID();
    const bookingReference = generateBookingReference();
    await transaction.insert(bookings).values({
      id: bookingId,
      bookingReference,
      checkoutIntentId: intent.id,
      userId: intent.userId,
      packageId: intent.packageId,
      packageTierId: intent.packageTierId,
      departureDate: intent.departureDate,
      travellers: intent.travellers,
      status: "confirmed",
      unitPriceSnapshot: intent.unitPriceSnapshot,
      subtotal: intent.subtotal,
      vatPercentageSnapshot: intent.vatPercentageSnapshot,
      vatAmountSnapshot: intent.vatAmount,
      total: intent.grandTotal,
      minimumDepositPercentageSnapshot: intent.minimumDepositPercentageSnapshot,
      minimumDepositAmountSnapshot: intent.minimumDepositAmount,
      initialPaymentOption: intent.selectedPaymentOption,
      initialPaymentPercentageSnapshot:
        intent.selectedPaymentOption === "full"
          ? "100.00"
          : intent.minimumDepositPercentageSnapshot,
      amountInitiallyPaid: centsToMoney(paidCents),
      remainingBalanceSnapshot: centsToMoney(remainingCents),
      balanceDueDate,
      cancellationFeePercentageSnapshot:
        intent.cancellationFeePercentageSnapshot,
      cancellationFeeTypeSnapshot: intent.cancellationFeeTypeSnapshot,
      cancellationFeeValueSnapshot: intent.cancellationFeeValueSnapshot,
      cancellationPolicyTextSnapshot: intent.cancellationPolicyTextSnapshot,
      cancellationPolicySourceSnapshot: intent.cancellationPolicySourceSnapshot,
      currency: intent.currency,
      notes: intent.notes,
    });
    const booking = {
      id: bookingId,
      reference: bookingReference,
      status: "confirmed" as const,
      total: intent.grandTotal,
      currency: intent.currency,
    };

    await transaction.insert(bookingTravellers).values({
      bookingId: booking.id,
      firstName: intent.primaryTravellerFirstName,
      lastName: intent.primaryTravellerLastName,
      email: intent.primaryTravellerEmail,
      phone: intent.primaryTravellerPhone,
      nationality: intent.primaryTravellerNationality,
      dateOfBirth: intent.primaryTravellerDateOfBirth,
    });
    await transaction.insert(payments).values({
      bookingId: booking.id,
      purpose: paidCents >= recalculated.grandTotalCents ? "full" : "deposit",
      amount: centsToMoney(paidCents),
      currency: verifiedPayment.currency,
      provider: verifiedPayment.provider.trim(),
      providerTransactionId: verifiedPayment.providerTransactionId.trim(),
      status: "paid",
      verifiedAt: verifiedPayment.verifiedAt,
      paidAt: verifiedPayment.verifiedAt,
      metadata: JSON.stringify({
        verificationContext: verifiedPayment.verificationContext,
      }),
    });
    if (
      intent.stagedDocumentType &&
      intent.stagedDocumentStorageKey &&
      intent.stagedDocumentOriginalFilename &&
      intent.stagedDocumentMimeType &&
      intent.stagedDocumentFileSize
    ) {
      if (
        intent.stagedDocumentType !== "passport" &&
        intent.stagedDocumentType !== "national_id"
      )
        throw new BookingFinalizationError(
          "CHECKOUT_INVALID",
          "Checkout document type is invalid.",
        );
      await transaction.insert(bookingIdentityDocuments).values({
        bookingId: booking.id,
        userId: intent.userId,
        documentType: intent.stagedDocumentType,
        storageKey: intent.stagedDocumentStorageKey,
        originalFilename: intent.stagedDocumentOriginalFilename,
        mimeType: intent.stagedDocumentMimeType,
        fileSize: intent.stagedDocumentFileSize,
        verificationStatus: "pending",
      });
    }
    await transaction
      .update(bookingIntents)
      .set({
        status: "consumed",
        consumedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(bookingIntents.id, intent.id));

    return {
      ...booking,
      paymentStatus:
        remainingCents === 0 ? ("paid" as const) : ("partially_paid" as const),
    };
  });
  const [{ sendBookingConfirmationEmails }, { runPostResponseTask }] =
    await Promise.all([
      import("@/lib/booking-email.server"),
      import("@/lib/request-background.server"),
    ]);
  await runPostResponseTask(
    sendBookingConfirmationEmails(finalizedBooking.id),
    `Booking confirmation email orchestration (${finalizedBooking.reference})`,
  );
  return finalizedBooking;
}
