import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { db } from "../src/db/index.ts";
import { bookings, payments } from "../src/db/schema/bookings.ts";
import {
  emailTemplates,
  leadInteractions,
} from "../src/db/schema/communications.ts";
import { packages, packageTiers } from "../src/db/schema/packages.ts";
import { users } from "../src/db/schema/users.ts";
import {
  calculateCancellationFee,
  calculateRefund,
} from "../src/lib/booking-money.ts";
import { cancelBookingOwnedByCustomer } from "../src/lib/booking-cancellation.server.ts";
import { getMailRouting } from "../src/lib/mail-routing.server.ts";

if (!db) throw new Error("DATABASE_URL is required.");

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Phase 3.8 verification failed: ${message}`);
}

const runSmtp = process.argv.includes("--smtp");
const controlledRecipient = runSmtp
  ? process.env["MAIL_TEST_TO"]?.trim()
  : "phase38.cancellation@example.test";
if (runSmtp)
  assert(controlledRecipient, "MAIL_TEST_TO is required for real SMTP testing");

const [journey] = await db
  .select({
    packageId: packages.id,
    tierId: packageTiers.id,
    currency: packageTiers.currency,
  })
  .from(packages)
  .innerJoin(packageTiers, eq(packageTiers.packageId, packages.id))
  .where(eq(packages.status, true))
  .limit(1);
assert(journey, "an active package tier is required");

await db
  .insert(users)
  .values({
    id: randomUUID(),
    role: "customer",
    name: "Phase 38 Cancellation Traveller",
    email: controlledRecipient!,
    emailVerifiedAt: new Date(),
    passwordHash: "phase38-test-only",
    phone: "+9779800000038",
    country: "Nepal",
    nationality: "Nepali",
    dateOfBirth: "1990-01-01",
  })
  .onDuplicateKeyUpdate({ set: { email: sql`${users.email}` } });
const [customer] = await db
  .select()
  .from(users)
  .where(eq(users.email, controlledRecipient!))
  .limit(1);
assert(customer, "controlled customer unavailable");

type Scenario = {
  name: string;
  grandTotal: number;
  paid: number;
  refunded: number;
  feeType: "fixed" | "percentage";
  feeValue: number;
  expectedFee: number;
  expectedRefund: number;
};

const scenarios: Scenario[] = runSmtp
  ? [
      {
        name: "real-smtp",
        grandTotal: 3000,
        paid: 1800,
        refunded: 0,
        feeType: "percentage",
        feeValue: 10,
        expectedFee: 300,
        expectedRefund: 1500,
      },
    ]
  : [
      {
        name: "advance-percentage",
        grandTotal: 3000,
        paid: 1800,
        refunded: 0,
        feeType: "percentage",
        feeValue: 10,
        expectedFee: 300,
        expectedRefund: 1500,
      },
      {
        name: "full-percentage",
        grandTotal: 3000,
        paid: 3000,
        refunded: 0,
        feeType: "percentage",
        feeValue: 10,
        expectedFee: 300,
        expectedRefund: 2700,
      },
      {
        name: "fixed",
        grandTotal: 3000,
        paid: 1800,
        refunded: 0,
        feeType: "fixed",
        feeValue: 200,
        expectedFee: 200,
        expectedRefund: 1600,
      },
      {
        name: "zero-fee",
        grandTotal: 3000,
        paid: 1800,
        refunded: 0,
        feeType: "percentage",
        feeValue: 0,
        expectedFee: 0,
        expectedRefund: 1800,
      },
      {
        name: "fee-exceeds-paid",
        grandTotal: 3000,
        paid: 500,
        refunded: 0,
        feeType: "fixed",
        feeValue: 1000,
        expectedFee: 500,
        expectedRefund: 0,
      },
      {
        name: "prior-refund",
        grandTotal: 3000,
        paid: 3000,
        refunded: 500,
        feeType: "percentage",
        feeValue: 10,
        expectedFee: 300,
        expectedRefund: 2200,
      },
    ];

async function createAndCancel(scenario: Scenario) {
  const bookingId = randomUUID();
  const reference = `NH-2026-${randomUUID().replaceAll("-", "").slice(0, 16).toUpperCase()}`;
  await db.insert(bookings).values({
    id: bookingId,
    bookingReference: reference,
    userId: customer.id,
    packageId: journey.packageId,
    packageTierId: journey.tierId,
    departureDate: "2028-10-15",
    travellers: 2,
    status: "confirmed",
    total: scenario.grandTotal.toFixed(2),
    amountInitiallyPaid: scenario.paid.toFixed(2),
    remainingBalanceSnapshot: Math.max(
      scenario.grandTotal - scenario.paid,
      0,
    ).toFixed(2),
    cancellationFeePercentageSnapshot:
      scenario.feeType === "percentage" ? scenario.feeValue.toFixed(2) : "0.00",
    cancellationFeeTypeSnapshot: scenario.feeType,
    cancellationFeeValueSnapshot: scenario.feeValue.toFixed(2),
    cancellationPolicySourceSnapshot: "phase38_controlled_test",
    currency: journey.currency,
  });
  await db.insert(payments).values({
    id: randomUUID(),
    bookingId,
    purpose: scenario.paid >= scenario.grandTotal ? "full" : "deposit",
    amount: scenario.paid.toFixed(2),
    currency: journey.currency,
    provider: "phase38_test",
    providerTransactionId: `P38-PAID-${randomUUID()}`,
    status: "paid",
    verifiedAt: new Date(),
    paidAt: new Date(),
  });
  if (scenario.refunded > 0)
    await db.insert(payments).values({
      id: randomUUID(),
      bookingId,
      purpose: "refund",
      amount: scenario.refunded.toFixed(2),
      currency: journey.currency,
      provider: "phase38_test",
      providerTransactionId: `P38-REFUND-${randomUUID()}`,
      status: "refunded",
      verifiedAt: new Date(),
      paidAt: new Date(),
    });
  await cancelBookingOwnedByCustomer(
    reference,
    customer.id,
    `PHASE 3.8 ${scenario.name}`,
  );
  const [stored] = await db
    .select()
    .from(bookings)
    .where(eq(bookings.id, bookingId))
    .limit(1);
  assert(stored?.status === "cancelled", `${scenario.name} did not cancel`);
  assert(
    Number(stored.cancellationFeeAmount) === scenario.expectedFee,
    `${scenario.name} fee mismatch`,
  );
  assert(
    Number(stored.refundAmount) === scenario.expectedRefund,
    `${scenario.name} refund mismatch`,
  );
  assert(
    Number(stored.amountPaidAtCancellationSnapshot) === scenario.paid,
    `${scenario.name} paid snapshot mismatch`,
  );
  assert(
    Number(stored.previouslyRefundedAmountSnapshot) === scenario.refunded,
    `${scenario.name} prior refund snapshot mismatch`,
  );
  if (scenario.expectedRefund > 0) {
    assert(
      stored.refundProcessingDeadline && stored.cancelledAt,
      `${scenario.name} deadline missing`,
    );
    assert(
      stored.refundProcessingDeadline.getTime() -
        stored.cancelledAt.getTime() ===
        15 * 24 * 60 * 60 * 1000,
      `${scenario.name} deadline is not 15 days`,
    );
  } else
    assert(
      stored.refundProcessingDeadline === null,
      `${scenario.name} should not have a deadline`,
    );

  const emails = await db
    .select()
    .from(leadInteractions)
    .where(
      and(
        eq(leadInteractions.channel, "email"),
        sql`${leadInteractions.metadata} like ${`%"bookingId":"${bookingId}"%`}`,
      ),
    );
  assert(emails.length === 2, `${scenario.name} should record two emails`);
  assert(
    emails.some((row) => row.templateKey === "booking_cancellation_customer"),
    `${scenario.name} customer email missing`,
  );
  assert(
    emails.some((row) => row.templateKey === "booking_cancellation_admin"),
    `${scenario.name} admin email missing`,
  );
  for (const email of emails) {
    assert(
      email.fromAddress === "booking@nepalheaven.com",
      `${scenario.name} sender alias mismatch`,
    );
    assert(
      !email.body.toLowerCase().includes("admin@nepalheaven.com"),
      `${scenario.name} exposed admin address`,
    );
  }
  const adminEmail = emails.find(
    (row) => row.templateKey === "booking_cancellation_admin",
  )!;
  assert(
    adminEmail.toAddress === "booking@nepalheaven.com",
    `${scenario.name} admin recipient mismatch`,
  );
  if (scenario.name !== "smtp-failure")
    assert(
      adminEmail.body.includes(`/admin/crm/bookings/cancelled/${reference}`),
      `${scenario.name} admin deep link mismatch`,
    );
  if (scenario.expectedRefund === 0 && scenario.name !== "smtp-failure")
    assert(
      !emails
        .find((row) => row.templateKey === "booking_cancellation_customer")!
        .body.includes("processed within 15 calendar days"),
      `${scenario.name} promised a zero refund`,
    );
  if (runSmtp)
    assert(
      emails.every(
        (row) => row.deliveryStatus === "sent" && row.providerMessageId,
      ),
      "SMTP did not accept both cancellation emails",
    );

  let repeatedRejected = false;
  try {
    await cancelBookingOwnedByCustomer(reference, customer.id, "repeat");
  } catch {
    repeatedRejected = true;
  }
  assert(
    repeatedRejected,
    `${scenario.name} repeated cancellation was accepted`,
  );
  const [emailCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(leadInteractions)
    .where(
      sql`${leadInteractions.metadata} like ${`%"bookingId":"${bookingId}"%`}`,
    );
  assert(Number(emailCount?.count) === 2, `${scenario.name} duplicated emails`);
  return { reference, bookingId, emails };
}

if (!runSmtp) {
  process.env["MAIL_MODE"] = "log";
  const percentageFee = calculateCancellationFee(300_000, "percentage", 10);
  assert(percentageFee === 30_000, "percentage basis is not grand total");
  assert(
    calculateCancellationFee(300_000, "fixed", 200) === 20_000,
    "fixed fee calculation failed",
  );
  const clamped = calculateRefund(50_000, 100_000);
  assert(
    clamped.cancellationFeeChargedCents === 50_000 &&
      clamped.refundDueCents === 0,
    "fee clamp failed",
  );
}

const results = [];
for (const scenario of scenarios) results.push(await createAndCancel(scenario));

if (!runSmtp) {
  const original = {
    mode: process.env["MAIL_MODE"],
    host: process.env["MAIL_HOST"],
    port: process.env["MAIL_PORT"],
    secure: process.env["MAIL_SECURE"],
  };
  process.env["MAIL_MODE"] = "smtp";
  process.env["MAIL_HOST"] = "127.0.0.1";
  process.env["MAIL_PORT"] = "1";
  process.env["MAIL_SECURE"] = "false";
  const failed = await createAndCancel({
    name: "smtp-failure",
    grandTotal: 1000,
    paid: 600,
    refunded: 0,
    feeType: "percentage",
    feeValue: 10,
    expectedFee: 100,
    expectedRefund: 500,
  });
  assert(
    failed.emails.every((row) => row.deliveryStatus === "failed"),
    "SMTP failures were not recorded",
  );
  const [persisted] = await db
    .select()
    .from(bookings)
    .where(eq(bookings.id, failed.bookingId))
    .limit(1);
  assert(
    persisted?.status === "cancelled" && persisted.refundAmount === "500.00",
    "SMTP failure rolled back cancellation",
  );
  process.env["MAIL_MODE"] = original.mode;
  process.env["MAIL_HOST"] = original.host;
  process.env["MAIL_PORT"] = original.port;
  process.env["MAIL_SECURE"] = original.secure;
}

const [templateCount] = await db
  .select({ count: sql<number>`count(*)` })
  .from(emailTemplates);
assert(Number(templateCount?.count) === 19, "expected 19 idempotent templates");
assert(
  getMailRouting().bookings.address === "booking@nepalheaven.com",
  "canonical booking alias mismatch",
);

console.log(
  JSON.stringify(
    {
      mode: runSmtp ? "smtp" : "deterministic",
      scenarios: scenarios.map((item) => item.name),
      references: results.map((item) => item.reference),
      templateCount: Number(templateCount?.count),
      bookingAlias: getMailRouting().bookings.address,
      status: "passed",
    },
    null,
    2,
  ),
);
process.exit(0);
