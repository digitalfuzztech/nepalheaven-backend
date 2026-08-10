ALTER TABLE "destinations" ADD COLUMN "sort_order" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "packages" ADD COLUMN "sort_order" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "testimonials" ADD COLUMN "sort_order" integer DEFAULT 0 NOT NULL;