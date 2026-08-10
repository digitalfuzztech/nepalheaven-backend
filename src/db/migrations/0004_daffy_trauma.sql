CREATE TABLE "booking_identity_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"document_type" "identity_document_type" NOT NULL,
	"storage_key" text NOT NULL,
	"original_filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"file_size" integer NOT NULL,
	"verification_status" "identity_verification_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "booking_identity_documents_booking_id_unique" UNIQUE("booking_id"),
	CONSTRAINT "booking_identity_documents_storage_key_unique" UNIQUE("storage_key")
);
--> statement-breakpoint
ALTER TABLE "packages" ALTER COLUMN "cancellation_fee_percentage" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "packages" ALTER COLUMN "cancellation_fee_percentage" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "date_of_birth" date;--> statement-breakpoint
ALTER TABLE "destinations" ADD COLUMN "cancellation_fee_percentage" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "booking_intents" ADD COLUMN "primary_traveller_date_of_birth" timestamp;--> statement-breakpoint
ALTER TABLE "booking_intents" ADD COLUMN "cancellation_policy_source_snapshot" text;--> statement-breakpoint
ALTER TABLE "booking_intents" ADD COLUMN "staged_document_type" text;--> statement-breakpoint
ALTER TABLE "booking_intents" ADD COLUMN "staged_document_storage_key" text;--> statement-breakpoint
ALTER TABLE "booking_intents" ADD COLUMN "staged_document_original_filename" text;--> statement-breakpoint
ALTER TABLE "booking_intents" ADD COLUMN "staged_document_mime_type" text;--> statement-breakpoint
ALTER TABLE "booking_intents" ADD COLUMN "staged_document_file_size" integer;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "initial_payment_option" "checkout_payment_option";--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "initial_payment_percentage_snapshot" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "cancellation_policy_source_snapshot" text;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "cancellation_fee_amount" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "refund_amount" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "cancelled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "cancellation_reason" text;--> statement-breakpoint
ALTER TABLE "booking_identity_documents" ADD CONSTRAINT "booking_identity_documents_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_identity_documents" ADD CONSTRAINT "booking_identity_documents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "booking_identity_documents_user_id_idx" ON "booking_identity_documents" USING btree ("user_id");
--> statement-breakpoint
INSERT INTO "site_settings" ("key", "value") VALUES
  ('booking.minimum_advance_percentage', '60'),
  ('booking.default_cancellation_fee_percentage', '0')
ON CONFLICT ("key") DO NOTHING;
