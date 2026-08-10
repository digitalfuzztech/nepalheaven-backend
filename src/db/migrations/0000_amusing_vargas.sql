ALTER TABLE "destinations" ADD COLUMN IF NOT EXISTS "category" text;--> statement-breakpoint
ALTER TABLE "destinations" ADD COLUMN IF NOT EXISTS "difficulty" text;--> statement-breakpoint
ALTER TABLE "destinations" ADD COLUMN IF NOT EXISTS "duration" text;--> statement-breakpoint
ALTER TABLE "destinations" ADD COLUMN IF NOT EXISTS "altitude_label" text;--> statement-breakpoint
ALTER TABLE "destinations" ADD COLUMN IF NOT EXISTS "min_altitude" integer;--> statement-breakpoint
ALTER TABLE "destinations" ADD COLUMN IF NOT EXISTS "max_altitude" integer;--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "destination_exclusions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "destination_id" uuid NOT NULL,
  "item" text NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  CONSTRAINT "destination_exclusions_destination_id_destinations_id_fk" FOREIGN KEY ("destination_id") REFERENCES "public"."destinations"("id") ON DELETE cascade ON UPDATE no action
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "destination_highlights" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "destination_id" uuid NOT NULL,
  "item" text NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  CONSTRAINT "destination_highlights_destination_id_destinations_id_fk" FOREIGN KEY ("destination_id") REFERENCES "public"."destinations"("id") ON DELETE cascade ON UPDATE no action
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "destination_inclusions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "destination_id" uuid NOT NULL,
  "item" text NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  CONSTRAINT "destination_inclusions_destination_id_destinations_id_fk" FOREIGN KEY ("destination_id") REFERENCES "public"."destinations"("id") ON DELETE cascade ON UPDATE no action
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "destination_itineraries" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "destination_id" uuid NOT NULL,
  "day_label" text NOT NULL,
  "title" text NOT NULL,
  "description" text,
  "sort_order" integer DEFAULT 0 NOT NULL,
  CONSTRAINT "destination_itineraries_destination_id_destinations_id_fk" FOREIGN KEY ("destination_id") REFERENCES "public"."destinations"("id") ON DELETE cascade ON UPDATE no action
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "destination_tips" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "destination_id" uuid NOT NULL,
  "item" text NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  CONSTRAINT "destination_tips_destination_id_destinations_id_fk" FOREIGN KEY ("destination_id") REFERENCES "public"."destinations"("id") ON DELETE cascade ON UPDATE no action
);--> statement-breakpoint

ALTER TABLE "packages" ADD COLUMN IF NOT EXISTS "old_price" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "packages" ADD COLUMN IF NOT EXISTS "hero_image" text;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "package_destinations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "package_id" uuid NOT NULL,
  "destination_id" uuid NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  CONSTRAINT "package_destinations_package_id_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."packages"("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "package_destinations_destination_id_destinations_id_fk" FOREIGN KEY ("destination_id") REFERENCES "public"."destinations"("id") ON DELETE cascade ON UPDATE no action
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "package_destinations_package_destination_unique" ON "package_destinations" USING btree ("package_id", "destination_id");--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "package_highlights" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "package_id" uuid NOT NULL,
  "item" text NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  CONSTRAINT "package_highlights_package_id_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."packages"("id") ON DELETE cascade ON UPDATE no action
);--> statement-breakpoint
ALTER TABLE "package_itineraries" ALTER COLUMN "day" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "package_itineraries" ADD COLUMN IF NOT EXISTS "day_label" text;

ALTER TABLE "blog_posts" ADD COLUMN IF NOT EXISTS "author_name" text;--> statement-breakpoint
ALTER TABLE "blog_posts" ADD COLUMN IF NOT EXISTS "author_role" text;--> statement-breakpoint
ALTER TABLE "blog_posts" ADD COLUMN IF NOT EXISTS "reading_time_minutes" integer;--> statement-breakpoint
ALTER TABLE "testimonials" ADD COLUMN IF NOT EXISTS "trip_name" text;--> statement-breakpoint
ALTER TABLE "testimonials" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
