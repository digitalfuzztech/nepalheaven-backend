import {
  boolean,
  date,
  decimal,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";
import { users } from "./users";
import { cancellationFeeTypeValues, packages, packageTiers } from "./packages";
import {
  defaultMomentColumn,
  momentColumn,
  uuidColumn,
  uuidPrimaryColumn,
} from "./columns";

// `pending` remains as a legacy-compatible value for existing development data.
// Valid bookings are created as confirmed after a qualifying verified payment.
export const bookingStatusValues = [
  "pending",
  "confirmed",
  "cancelled",
  "completed",
] as const;
export const paymentStatusValues = [
  "pending",
  "processing",
  "paid",
  "failed",
  "refunded",
] as const;
export const paymentPurposeValues = [
  "deposit",
  "full",
  "balance",
  "additional",
  "refund",
] as const;
export const checkoutIntentStatusValues = [
  "open",
  "consumed",
  "expired",
  "cancelled",
] as const;
export const checkoutPaymentOptionValues = ["minimum", "full"] as const;

export const bookingIntents = mysqlTable(
  "booking_intents",
  {
    id: uuidPrimaryColumn("id").primaryKey(),
    checkoutReference: varchar("checkout_reference", { length: 64 })
      .notNull()
      .unique(),
    userId: uuidColumn("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    packageId: uuidColumn("package_id")
      .notNull()
      .references(() => packages.id, { onDelete: "restrict" }),
    packageTierId: uuidColumn("package_tier_id")
      .notNull()
      .references(() => packageTiers.id, { onDelete: "restrict" }),
    departureDate: date("departure_date", { mode: "string" }).notNull(),
    travellers: int("travellers").notNull(),
    primaryTravellerFirstName: text("primary_traveller_first_name").notNull(),
    primaryTravellerLastName: text("primary_traveller_last_name").notNull(),
    primaryTravellerEmail: text("primary_traveller_email").notNull(),
    primaryTravellerPhone: text("primary_traveller_phone").notNull(),
    primaryTravellerNationality: text("primary_traveller_nationality"),
    primaryTravellerDateOfBirth: date("primary_traveller_date_of_birth", {
      mode: "string",
    }),
    notes: text("notes"),
    unitPriceSnapshot: decimal("unit_price_snapshot", {
      precision: 12,
      scale: 2,
    }).notNull(),
    subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull(),
    vatEnabledSnapshot: boolean("vat_enabled_snapshot").notNull(),
    vatPercentageSnapshot: decimal("vat_percentage_snapshot", {
      precision: 5,
      scale: 2,
    }).notNull(),
    vatAmount: decimal("vat_amount", { precision: 12, scale: 2 }).notNull(),
    grandTotal: decimal("grand_total", { precision: 12, scale: 2 }).notNull(),
    minimumDepositPercentageSnapshot: decimal(
      "minimum_deposit_percentage_snapshot",
      { precision: 5, scale: 2 },
    ).notNull(),
    minimumDepositAmount: decimal("minimum_deposit_amount", {
      precision: 12,
      scale: 2,
    }).notNull(),
    balanceDueDaysSnapshot: int("balance_due_days_snapshot").notNull(),
    cancellationFeePercentageSnapshot: decimal(
      "cancellation_fee_percentage_snapshot",
      { precision: 5, scale: 2 },
    ).notNull(),
    cancellationFeeTypeSnapshot: mysqlEnum(
      "cancellation_fee_type_snapshot",
      cancellationFeeTypeValues,
    )
      .default("percentage")
      .notNull(),
    cancellationFeeValueSnapshot: decimal("cancellation_fee_value_snapshot", {
      precision: 12,
      scale: 2,
    })
      .default("0.00")
      .notNull(),
    cancellationPolicyTextSnapshot: text("cancellation_policy_text_snapshot"),
    cancellationPolicySourceSnapshot: text(
      "cancellation_policy_source_snapshot",
    ),
    stagedDocumentType: text("staged_document_type"),
    stagedDocumentStorageKey: text("staged_document_storage_key"),
    stagedDocumentOriginalFilename: text("staged_document_original_filename"),
    stagedDocumentMimeType: text("staged_document_mime_type"),
    stagedDocumentFileSize: int("staged_document_file_size"),
    currency: text("currency").notNull(),
    selectedPaymentOption: mysqlEnum(
      "selected_payment_option",
      checkoutPaymentOptionValues,
    )
      .default("minimum")
      .notNull(),
    status: mysqlEnum("status", checkoutIntentStatusValues)
      .default("open")
      .notNull(),
    expiresAt: momentColumn("expires_at").notNull(),
    consumedAt: momentColumn("consumed_at"),
    createdAt: defaultMomentColumn("created_at").notNull(),
    updatedAt: defaultMomentColumn("updated_at").notNull(),
  },
  (table) => [
    index("booking_intents_user_status_idx").on(table.userId, table.status),
    index("booking_intents_expires_at_idx").on(table.expiresAt),
  ],
);

export const bookings = mysqlTable("bookings", {
  id: uuidPrimaryColumn("id").primaryKey(),
  bookingReference: varchar("booking_reference", { length: 64 })
    .notNull()
    .unique(),
  checkoutIntentId: uuidColumn("checkout_intent_id")
    .unique()
    .references(() => bookingIntents.id, { onDelete: "restrict" }),
  userId: uuidColumn("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "restrict" }),
  packageId: uuidColumn("package_id")
    .notNull()
    .references(() => packages.id, { onDelete: "restrict" }),
  packageTierId: uuidColumn("package_tier_id").references(
    () => packageTiers.id,
    {
      onDelete: "set null",
    },
  ),
  departureDate: date("departure_date", { mode: "string" }),
  travellers: int("travellers").default(1).notNull(),
  status: mysqlEnum("status", bookingStatusValues)
    .default("confirmed")
    .notNull(),
  unitPriceSnapshot: decimal("unit_price_snapshot", {
    precision: 12,
    scale: 2,
  }),
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }),
  vatPercentageSnapshot: decimal("vat_percentage_snapshot", {
    precision: 5,
    scale: 2,
  }),
  vatAmountSnapshot: decimal("vat_amount_snapshot", {
    precision: 12,
    scale: 2,
  }),
  total: decimal("total", { precision: 12, scale: 2 }),
  minimumDepositPercentageSnapshot: decimal(
    "minimum_deposit_percentage_snapshot",
    { precision: 5, scale: 2 },
  ),
  minimumDepositAmountSnapshot: decimal("minimum_deposit_amount_snapshot", {
    precision: 12,
    scale: 2,
  }),
  initialPaymentOption: mysqlEnum(
    "initial_payment_option",
    checkoutPaymentOptionValues,
  ),
  initialPaymentPercentageSnapshot: decimal(
    "initial_payment_percentage_snapshot",
    { precision: 5, scale: 2 },
  ),
  amountInitiallyPaid: decimal("amount_initially_paid", {
    precision: 12,
    scale: 2,
  }),
  remainingBalanceSnapshot: decimal("remaining_balance_snapshot", {
    precision: 12,
    scale: 2,
  }),
  balanceDueDate: date("balance_due_date", { mode: "string" }),
  cancellationFeePercentageSnapshot: decimal(
    "cancellation_fee_percentage_snapshot",
    { precision: 5, scale: 2 },
  ),
  cancellationFeeTypeSnapshot: mysqlEnum(
    "cancellation_fee_type_snapshot",
    cancellationFeeTypeValues,
  )
    .default("percentage")
    .notNull(),
  cancellationFeeValueSnapshot: decimal("cancellation_fee_value_snapshot", {
    precision: 12,
    scale: 2,
  })
    .default("0.00")
    .notNull(),
  cancellationPolicyTextSnapshot: text("cancellation_policy_text_snapshot"),
  cancellationPolicySourceSnapshot: text("cancellation_policy_source_snapshot"),
  cancellationFeeAmount: decimal("cancellation_fee_amount", {
    precision: 12,
    scale: 2,
  }),
  refundAmount: decimal("refund_amount", { precision: 12, scale: 2 }),
  amountPaidAtCancellationSnapshot: decimal(
    "amount_paid_at_cancellation_snapshot",
    { precision: 12, scale: 2 },
  ),
  previouslyRefundedAmountSnapshot: decimal(
    "previously_refunded_amount_snapshot",
    { precision: 12, scale: 2 },
  ),
  refundProcessingDeadline: momentColumn("refund_processing_deadline"),
  cancelledAt: momentColumn("cancelled_at"),
  cancellationReason: text("cancellation_reason"),
  currency: text("currency").default("USD").notNull(),
  notes: text("notes"),
  createdAt: defaultMomentColumn("created_at").notNull(),
  updatedAt: defaultMomentColumn("updated_at").notNull(),
});

export const bookingTravellers = mysqlTable("booking_travellers", {
  id: uuidPrimaryColumn("id").primaryKey(),
  bookingId: uuidColumn("booking_id")
    .notNull()
    .references(() => bookings.id, { onDelete: "cascade" }),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email"),
  phone: text("phone"),
  nationality: text("nationality"),
  dateOfBirth: date("date_of_birth", { mode: "string" }),
  specialRequirements: text("special_requirements"),
});

export const payments = mysqlTable(
  "payments",
  {
    id: uuidPrimaryColumn("id").primaryKey(),
    bookingId: uuidColumn("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    purpose: mysqlEnum("purpose", paymentPurposeValues),
    amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
    currency: text("currency").default("USD").notNull(),
    provider: varchar("provider", { length: 64 }),
    providerTransactionId: varchar("provider_transaction_id", { length: 191 }),
    status: mysqlEnum("status", paymentStatusValues)
      .default("pending")
      .notNull(),
    verifiedAt: momentColumn("verified_at"),
    paidAt: momentColumn("paid_at"),
    failureReason: text("failure_reason"),
    metadata: text("metadata"),
    createdAt: defaultMomentColumn("created_at").notNull(),
    updatedAt: defaultMomentColumn("updated_at").notNull(),
  },
  (table) => [
    index("payments_booking_created_idx").on(table.bookingId, table.createdAt),
    uniqueIndex("payments_provider_transaction_unique").on(
      table.provider,
      table.providerTransactionId,
    ),
  ],
);
