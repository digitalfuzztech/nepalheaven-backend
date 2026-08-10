CREATE TYPE "public"."checkout_intent_status" AS ENUM('open', 'consumed', 'expired', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."checkout_payment_option" AS ENUM('minimum', 'full');--> statement-breakpoint
CREATE TYPE "public"."payment_purpose" AS ENUM('deposit', 'full', 'balance', 'additional', 'refund');--> statement-breakpoint
CREATE TYPE "public"."identity_document_type" AS ENUM('passport', 'national_id');--> statement-breakpoint
CREATE TYPE "public"."identity_verification_status" AS ENUM('pending', 'verified', 'rejected');--> statement-breakpoint
CREATE TABLE "booking_intents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"checkout_reference" text NOT NULL,
	"user_id" uuid NOT NULL,
	"package_id" uuid NOT NULL,
	"package_tier_id" uuid NOT NULL,
	"departure_date" timestamp NOT NULL,
	"travellers" integer NOT NULL,
	"primary_traveller_first_name" text NOT NULL,
	"primary_traveller_last_name" text NOT NULL,
	"primary_traveller_email" text NOT NULL,
	"primary_traveller_phone" text NOT NULL,
	"primary_traveller_nationality" text,
	"notes" text,
	"unit_price_snapshot" numeric(12, 2) NOT NULL,
	"subtotal" numeric(12, 2) NOT NULL,
	"vat_enabled_snapshot" boolean NOT NULL,
	"vat_percentage_snapshot" numeric(5, 2) NOT NULL,
	"vat_amount" numeric(12, 2) NOT NULL,
	"grand_total" numeric(12, 2) NOT NULL,
	"minimum_deposit_percentage_snapshot" numeric(5, 2) NOT NULL,
	"minimum_deposit_amount" numeric(12, 2) NOT NULL,
	"balance_due_days_snapshot" integer NOT NULL,
	"cancellation_fee_percentage_snapshot" numeric(5, 2) NOT NULL,
	"currency" text NOT NULL,
	"selected_payment_option" "checkout_payment_option" DEFAULT 'minimum' NOT NULL,
	"status" "checkout_intent_status" DEFAULT 'open' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "booking_intents_checkout_reference_unique" UNIQUE("checkout_reference")
);
--> statement-breakpoint
CREATE TABLE "user_identity_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"document_type" "identity_document_type" NOT NULL,
	"storage_key" text NOT NULL,
	"original_filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"file_size" integer NOT NULL,
	"verification_status" "identity_verification_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_identity_documents_storage_key_unique" UNIQUE("storage_key")
);
--> statement-breakpoint
ALTER TABLE "bookings" ALTER COLUMN "status" SET DEFAULT 'confirmed';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "nationality" text;--> statement-breakpoint
ALTER TABLE "packages" ADD COLUMN "cancellation_fee_percentage" numeric(5, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "checkout_intent_id" uuid;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "unit_price_snapshot" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "vat_percentage_snapshot" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "vat_amount_snapshot" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "minimum_deposit_percentage_snapshot" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "minimum_deposit_amount_snapshot" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "amount_initially_paid" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "remaining_balance_snapshot" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "balance_due_date" timestamp;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "cancellation_fee_percentage_snapshot" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "purpose" "payment_purpose";--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "verified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "booking_intents" ADD CONSTRAINT "booking_intents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_intents" ADD CONSTRAINT "booking_intents_package_id_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."packages"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_intents" ADD CONSTRAINT "booking_intents_package_tier_id_package_tiers_id_fk" FOREIGN KEY ("package_tier_id") REFERENCES "public"."package_tiers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_identity_documents" ADD CONSTRAINT "user_identity_documents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "booking_intents_user_status_idx" ON "booking_intents" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "booking_intents_expires_at_idx" ON "booking_intents" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "user_identity_documents_user_id_idx" ON "user_identity_documents" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_checkout_intent_id_booking_intents_id_fk" FOREIGN KEY ("checkout_intent_id") REFERENCES "public"."booking_intents"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "payments_booking_created_idx" ON "payments" USING btree ("booking_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "payments_provider_transaction_unique" ON "payments" USING btree ("provider","provider_transaction_id");--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_checkout_intent_id_unique" UNIQUE("checkout_intent_id");
--> statement-breakpoint
INSERT INTO "site_settings" ("key", "value") VALUES
  ('booking.vat_enabled', 'false'),
  ('booking.vat_percentage', '0'),
  ('booking.minimum_deposit_percentage', '60'),
  ('booking.balance_due_days_before_departure', '0')
ON CONFLICT ("key") DO NOTHING;
