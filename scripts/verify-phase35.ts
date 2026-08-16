import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { db } from "../src/db/index.ts";
import {
  bookingIntents,
  bookings,
  payments,
} from "../src/db/schema/bookings.ts";
import {
  emailTemplates,
  leadInteractions,
} from "../src/db/schema/communications.ts";
import { packages, packageTiers } from "../src/db/schema/packages.ts";
import { users } from "../src/db/schema/users.ts";
import { finalizeBookingAfterVerifiedPayment } from "../src/lib/booking-finalization.server.ts";
import {
  calculateCommercialAmounts,
  centsToMoney,
} from "../src/lib/booking-money.ts";
import { getBookingCommercialConfiguration } from "../src/lib/booking-settings.server.ts";
import {
  chargeDevelopmentMockCard,
  PaymentProviderError,
} from "../src/lib/payment-provider.server.ts";

if (!db) throw new Error("DATABASE_URL is required.");
process.env["PAYMENT_MODE"] = "mock";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Phase 3.5 verification failed: ${message}`);
}

const email = "phase35.booking@example.test";
await db
  .insert(users)
  .values({
    id: randomUUID(),
    role: "customer",
    name: "Phase 35 Traveller",
    email,
    passwordHash: "phase35-verification-only",
    phone: "+9779800000035",
    country: "Nepal",
    nationality: "Nepali",
    dateOfBirth: "1990-01-01",
  })
  .onDuplicateKeyUpdate({ set: { email: sql`${users.email}` } });
const [customer] = await db
  .select()
  .from(users)
  .where(eq(users.email, email))
  .limit(1);
assert(customer, "test customer unavailable");

const [journey] = await db
  .select({
    packageId: packages.id,
    packageName: packages.title,
    tierId: packageTiers.id,
    tierPrice: packageTiers.price,
    currency: packageTiers.currency,
  })
  .from(packages)
  .innerJoin(packageTiers, eq(packageTiers.packageId, packages.id))
  .where(eq(packages.status, true))
  .limit(1);
assert(journey, "an active package tier is required");
const config = await getBookingCommercialConfiguration();

async function createIntent(
  option: "minimum" | "full",
  travellerEmail = email,
) {
  const amounts = calculateCommercialAmounts(journey.tierPrice, 2, config);
  const id = randomUUID();
  const reference = `CHK-P35-${randomUUID().replaceAll("-", "").toUpperCase()}`;
  await db.insert(bookingIntents).values({
    id,
    checkoutReference: reference,
    userId: customer.id,
    packageId: journey.packageId,
    packageTierId: journey.tierId,
    departureDate: "2027-10-15",
    travellers: 2,
    primaryTravellerFirstName: "Phase 35",
    primaryTravellerLastName: "Traveller",
    primaryTravellerEmail: travellerEmail,
    primaryTravellerPhone: "+9779800000035",
    primaryTravellerNationality: "Nepali",
    primaryTravellerDateOfBirth: "1990-01-01",
    notes: `PHASE 3.5 ${option.toUpperCase()} PAYMENT TEST`,
    unitPriceSnapshot: centsToMoney(amounts.unitPriceCents),
    subtotal: centsToMoney(amounts.subtotalCents),
    vatEnabledSnapshot: config.vatEnabled,
    vatPercentageSnapshot: config.vatPercentage.toFixed(2),
    vatAmount: centsToMoney(amounts.vatAmountCents),
    grandTotal: centsToMoney(amounts.grandTotalCents),
    minimumDepositPercentageSnapshot:
      config.minimumDepositPercentage.toFixed(2),
    minimumDepositAmount: centsToMoney(amounts.minimumDepositCents),
    balanceDueDaysSnapshot: config.balanceDueDaysBeforeDeparture,
    cancellationFeePercentageSnapshot: "0.00",
    cancellationPolicySourceSnapshot: "phase35_verification",
    currency: journey.currency,
    selectedPaymentOption: option,
    status: "open",
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
  });
  return {
    id,
    reference,
    grandTotal: centsToMoney(amounts.grandTotalCents),
    paid:
      option === "full"
        ? centsToMoney(amounts.grandTotalCents)
        : centsToMoney(amounts.minimumDepositCents),
    remaining:
      option === "full"
        ? "0.00"
        : centsToMoney(amounts.grandTotalCents - amounts.minimumDepositCents),
  };
}

async function successfulPayment(
  option: "minimum" | "full",
  mode: "log" | "failed-smtp" | "real-smtp",
) {
  const actualMail = {
    mode: process.env["MAIL_MODE"],
    host: process.env["MAIL_HOST"],
    port: process.env["MAIL_PORT"],
    secure: process.env["MAIL_SECURE"],
  };
  const realRecipient =
    mode === "real-smtp" ? process.env["MAIL_ADMIN_TO"]?.trim() : undefined;
  if (mode === "real-smtp") assert(realRecipient, "MAIL_ADMIN_TO is required");
  const intent = await createIntent(option, realRecipient || email);
  if (mode === "log") process.env["MAIL_MODE"] = "log";
  if (mode === "failed-smtp") {
    process.env["MAIL_MODE"] = "smtp";
    process.env["MAIL_HOST"] = "127.0.0.1";
    process.env["MAIL_PORT"] = "1";
    process.env["MAIL_SECURE"] = "false";
  }
  if (mode === "real-smtp") {
    process.env["MAIL_MODE"] = actualMail.mode;
    process.env["MAIL_HOST"] = actualMail.host;
    process.env["MAIL_PORT"] = actualMail.port;
    process.env["MAIL_SECURE"] = actualMail.secure;
  }
  const verified = await chargeDevelopmentMockCard(
    {
      cardholderName: "Phase 35 Traveller",
      cardNumber: "4242424242424242",
      expiry: "12/30",
      cvv: "123",
    },
    intent.paid,
    journey.currency,
  );
  const booking = await finalizeBookingAfterVerifiedPayment(intent.reference, {
    ...verified,
    expectedCustomerId: customer.id,
  });
  const [stored] = await db
    .select()
    .from(bookings)
    .where(eq(bookings.id, booking.id))
    .limit(1);
  const [payment] = await db
    .select()
    .from(payments)
    .where(eq(payments.bookingId, booking.id))
    .limit(1);
  const emails = await db
    .select()
    .from(leadInteractions)
    .where(
      and(
        eq(leadInteractions.channel, "email"),
        sql`${leadInteractions.metadata} like ${`%"bookingId":"${booking.id}"%`}`,
      ),
    );
  assert(stored?.status === "confirmed", `${option} booking not confirmed`);
  assert(payment?.status === "paid", `${option} payment not paid`);
  assert(
    stored.total === intent.grandTotal,
    `${option} total snapshot changed`,
  );
  assert(
    stored.amountInitiallyPaid === intent.paid,
    `${option} paid snapshot changed`,
  );
  assert(
    stored.remainingBalanceSnapshot === intent.remaining,
    `${option} balance snapshot changed`,
  );
  assert(emails.length === 2, `${option} should record exactly two emails`);
  const customerEmail = emails.find(
    (item) => item.templateKey === "booking_customer_confirmation",
  );
  const adminEmail = emails.find(
    (item) => item.templateKey === "booking_admin_notification",
  );
  assert(customerEmail && adminEmail, `${option} templates not both recorded`);
  const expectedType = option === "full" ? "Full Payment" : "Advance Payment";
  const expectedStatus = option === "full" ? "Paid in Full" : "Partially Paid";
  if (mode !== "failed-smtp")
    for (const item of [customerEmail, adminEmail]) {
      const metadata = JSON.parse(item.metadata || "{}");
      assert(
        metadata.attachments?.length === 1 &&
          metadata.attachments[0]?.contentType === "application/pdf" &&
          metadata.attachments[0]?.filename ===
            `Nepal-Heaven-Invoice-${booking.reference}.pdf` &&
          metadata.attachments[0]?.size > 1_000,
        `${option} PDF invoice attachment missing`,
      );
      assert(
        item.body.includes(`Payment Type: ${expectedType}`),
        `${option} payment type missing`,
      );
      assert(
        item.body.includes(
          `Grand Total: ${journey.currency} ${Number(intent.grandTotal).toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
        ),
        `${option} total missing`,
      );
      assert(
        item.body.includes(`Payment Status: ${expectedStatus}`),
        `${option} payment status missing`,
      );
    }
  if (mode === "failed-smtp")
    assert(
      emails.every((item) => item.deliveryStatus === "failed"),
      "SMTP failures not recorded",
    );
  if (mode === "real-smtp")
    assert(
      emails.every((item) => item.deliveryStatus === "sent"),
      "SMTP did not accept both emails",
    );

  await finalizeBookingAfterVerifiedPayment(intent.reference, {
    ...verified,
    expectedCustomerId: customer.id,
  });
  const replayEmails = await db
    .select({ count: sql<number>`count(*)` })
    .from(leadInteractions)
    .where(
      sql`${leadInteractions.metadata} like ${`%"bookingId":"${booking.id}"%`}`,
    );
  assert(
    Number(replayEmails[0]?.count) === 2,
    "payment replay duplicated booking emails",
  );

  process.env["MAIL_MODE"] = actualMail.mode;
  process.env["MAIL_HOST"] = actualMail.host;
  process.env["MAIL_PORT"] = actualMail.port;
  process.env["MAIL_SECURE"] = actualMail.secure;
  return { booking, emails };
}

const [templateCount] = await db
  .select({ count: sql<number>`count(*)` })
  .from(emailTemplates);
assert(
  Number(templateCount?.count) === 19,
  "expected exactly 19 email templates",
);

if (process.argv.includes("--real-only")) {
  const realSmtp = await successfulPayment("full", "real-smtp");
  console.log(
    JSON.stringify(
      {
        realSmtp: {
          reference: realSmtp.booking.reference,
          statuses: realSmtp.emails.map((item) => item.deliveryStatus),
          recipients: "configured Nepal Heaven admin inbox only",
        },
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

const advance = await successfulPayment("minimum", "log");
const full = await successfulPayment("full", "log");

const declined = await createIntent("full");
let declinedCorrectly = false;
try {
  await chargeDevelopmentMockCard(
    {
      cardholderName: "Phase 35 Decline",
      cardNumber: "4000000000000002",
      expiry: "12/30",
      cvv: "123",
    },
    declined.paid,
    journey.currency,
  );
} catch (error) {
  declinedCorrectly =
    error instanceof PaymentProviderError && error.code === "DECLINED";
}
assert(declinedCorrectly, "decline card was not declined");
const declinedBookings = await db
  .select({ count: sql<number>`count(*)` })
  .from(bookings)
  .where(eq(bookings.checkoutIntentId, declined.id));
assert(Number(declinedBookings[0]?.count) === 0, "decline created a booking");

const failedSmtp = await successfulPayment("minimum", "failed-smtp");
const realSmtp = process.argv.includes("--real-smtp")
  ? await successfulPayment("full", "real-smtp")
  : null;

console.log(
  JSON.stringify(
    {
      templates: Number(templateCount?.count),
      advance: {
        reference: advance.booking.reference,
        status: "confirmed",
        emails: 2,
      },
      full: {
        reference: full.booking.reference,
        status: "confirmed",
        emails: 2,
      },
      declined: { bookingCreated: false, emails: 0 },
      smtpFailure: {
        reference: failedSmtp.booking.reference,
        bookingPersisted: true,
        emailStatuses: failedSmtp.emails.map((item) => item.deliveryStatus),
      },
      replay: "no duplicate records",
      realSmtp: realSmtp
        ? {
            reference: realSmtp.booking.reference,
            statuses: realSmtp.emails.map((item) => item.deliveryStatus),
          }
        : "not requested",
    },
    null,
    2,
  ),
);
process.exit(0);
