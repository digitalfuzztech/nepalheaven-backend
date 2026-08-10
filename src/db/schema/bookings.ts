import {
  boolean,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { packages, packageTiers } from "./packages";

// `pending` remains in the PostgreSQL enum for additive-migration safety only.
// Valid bookings are created as confirmed after a qualifying verified payment.
export const bookingStatusEnum = pgEnum("booking_status", [
  "pending",
  "confirmed",
  "cancelled",
  "completed",
]);
export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "processing",
  "paid",
  "failed",
  "refunded",
]);
export const paymentPurposeEnum = pgEnum("payment_purpose", [
  "deposit",
  "full",
  "balance",
  "additional",
  "refund",
]);
export const checkoutIntentStatusEnum = pgEnum("checkout_intent_status", [
  "open",
  "consumed",
  "expired",
  "cancelled",
]);
export const checkoutPaymentOptionEnum = pgEnum("checkout_payment_option", [
  "minimum",
  "full",
]);

export const bookingIntents = pgTable(
  "booking_intents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    checkoutReference: text("checkout_reference").notNull().unique(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    packageId: uuid("package_id")
      .notNull()
      .references(() => packages.id, { onDelete: "restrict" }),
    packageTierId: uuid("package_tier_id")
      .notNull()
      .references(() => packageTiers.id, { onDelete: "restrict" }),
    departureDate: timestamp("departure_date", { withTimezone: false }).notNull(),
    travellers: integer("travellers").notNull(),
    primaryTravellerFirstName: text("primary_traveller_first_name").notNull(),
    primaryTravellerLastName: text("primary_traveller_last_name").notNull(),
    primaryTravellerEmail: text("primary_traveller_email").notNull(),
    primaryTravellerPhone: text("primary_traveller_phone").notNull(),
    primaryTravellerNationality: text("primary_traveller_nationality"),
    primaryTravellerDateOfBirth: timestamp("primary_traveller_date_of_birth", {
      withTimezone: false,
    }),
    notes: text("notes"),
    unitPriceSnapshot: numeric("unit_price_snapshot", {
      precision: 12,
      scale: 2,
    }).notNull(),
    subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull(),
    vatEnabledSnapshot: boolean("vat_enabled_snapshot").notNull(),
    vatPercentageSnapshot: numeric("vat_percentage_snapshot", {
      precision: 5,
      scale: 2,
    }).notNull(),
    vatAmount: numeric("vat_amount", { precision: 12, scale: 2 }).notNull(),
    grandTotal: numeric("grand_total", { precision: 12, scale: 2 }).notNull(),
    minimumDepositPercentageSnapshot: numeric(
      "minimum_deposit_percentage_snapshot",
      { precision: 5, scale: 2 },
    ).notNull(),
    minimumDepositAmount: numeric("minimum_deposit_amount", {
      precision: 12,
      scale: 2,
    }).notNull(),
    balanceDueDaysSnapshot: integer("balance_due_days_snapshot").notNull(),
    cancellationFeePercentageSnapshot: numeric(
      "cancellation_fee_percentage_snapshot",
      { precision: 5, scale: 2 },
    ).notNull(),
    cancellationPolicySourceSnapshot: text(
      "cancellation_policy_source_snapshot",
    ),
    stagedDocumentType: text("staged_document_type"),
    stagedDocumentStorageKey: text("staged_document_storage_key"),
    stagedDocumentOriginalFilename: text("staged_document_original_filename"),
    stagedDocumentMimeType: text("staged_document_mime_type"),
    stagedDocumentFileSize: integer("staged_document_file_size"),
    currency: text("currency").notNull(),
    selectedPaymentOption: checkoutPaymentOptionEnum(
      "selected_payment_option",
    )
      .default("minimum")
      .notNull(),
    status: checkoutIntentStatusEnum("status").default("open").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("booking_intents_user_status_idx").on(table.userId, table.status),
    index("booking_intents_expires_at_idx").on(table.expiresAt),
  ],
);

export const bookings = pgTable("bookings", {
  id: uuid("id").defaultRandom().primaryKey(),
  bookingReference: text("booking_reference").notNull().unique(),
  checkoutIntentId: uuid("checkout_intent_id")
    .unique()
    .references(() => bookingIntents.id, { onDelete: "restrict" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "restrict" }),
  packageId: uuid("package_id")
    .notNull()
    .references(() => packages.id, { onDelete: "restrict" }),
  packageTierId: uuid("package_tier_id").references(() => packageTiers.id, {
    onDelete: "set null",
  }),
  departureDate: timestamp("departure_date", { withTimezone: false }),
  travellers: integer("travellers").default(1).notNull(),
  status: bookingStatusEnum("status").default("confirmed").notNull(),
  unitPriceSnapshot: numeric("unit_price_snapshot", {
    precision: 12,
    scale: 2,
  }),
  subtotal: numeric("subtotal", { precision: 12, scale: 2 }),
  vatPercentageSnapshot: numeric("vat_percentage_snapshot", {
    precision: 5,
    scale: 2,
  }),
  vatAmountSnapshot: numeric("vat_amount_snapshot", {
    precision: 12,
    scale: 2,
  }),
  total: numeric("total", { precision: 12, scale: 2 }),
  minimumDepositPercentageSnapshot: numeric(
    "minimum_deposit_percentage_snapshot",
    { precision: 5, scale: 2 },
  ),
  minimumDepositAmountSnapshot: numeric("minimum_deposit_amount_snapshot", {
    precision: 12,
    scale: 2,
  }),
  initialPaymentOption: checkoutPaymentOptionEnum("initial_payment_option"),
  initialPaymentPercentageSnapshot: numeric(
    "initial_payment_percentage_snapshot",
    { precision: 5, scale: 2 },
  ),
  amountInitiallyPaid: numeric("amount_initially_paid", {
    precision: 12,
    scale: 2,
  }),
  remainingBalanceSnapshot: numeric("remaining_balance_snapshot", {
    precision: 12,
    scale: 2,
  }),
  balanceDueDate: timestamp("balance_due_date", { withTimezone: false }),
  cancellationFeePercentageSnapshot: numeric(
    "cancellation_fee_percentage_snapshot",
    { precision: 5, scale: 2 },
  ),
  cancellationPolicySourceSnapshot: text(
    "cancellation_policy_source_snapshot",
  ),
  cancellationFeeAmount: numeric("cancellation_fee_amount", {
    precision: 12,
    scale: 2,
  }),
  refundAmount: numeric("refund_amount", { precision: 12, scale: 2 }),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  cancellationReason: text("cancellation_reason"),
  currency: text("currency").default("USD").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const bookingTravellers = pgTable("booking_travellers", {
  id: uuid("id").defaultRandom().primaryKey(),
  bookingId: uuid("booking_id")
    .notNull()
    .references(() => bookings.id, { onDelete: "cascade" }),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email"),
  phone: text("phone"),
  nationality: text("nationality"),
  dateOfBirth: timestamp("date_of_birth", { withTimezone: false }),
  specialRequirements: text("special_requirements"),
});

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    purpose: paymentPurposeEnum("purpose"),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    currency: text("currency").default("USD").notNull(),
    provider: text("provider"),
    providerTransactionId: text("provider_transaction_id"),
    status: paymentStatusEnum("status").default("pending").notNull(),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    failureReason: text("failure_reason"),
    metadata: text("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("payments_booking_created_idx").on(table.bookingId, table.createdAt),
    uniqueIndex("payments_provider_transaction_unique").on(
      table.provider,
      table.providerTransactionId,
    ),
  ],
);
