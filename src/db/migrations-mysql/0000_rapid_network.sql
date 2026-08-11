CREATE TABLE `users` (
	`id` varchar(36) NOT NULL,
	`role` enum('admin','customer') NOT NULL DEFAULT 'customer',
	`name` text NOT NULL,
	`email` varchar(254) NOT NULL,
	`password_hash` text NOT NULL,
	`phone` text,
	`country` text,
	`nationality` text,
	`date_of_birth` date,
	`avatar_url` text,
	`email_verified_at` datetime(3),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `destination_exclusions` (
	`id` varchar(36) NOT NULL,
	`destination_id` varchar(36) NOT NULL,
	`item` text NOT NULL,
	`sort_order` int NOT NULL DEFAULT 0,
	CONSTRAINT `destination_exclusions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `destination_highlights` (
	`id` varchar(36) NOT NULL,
	`destination_id` varchar(36) NOT NULL,
	`item` text NOT NULL,
	`sort_order` int NOT NULL DEFAULT 0,
	CONSTRAINT `destination_highlights_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `destination_inclusions` (
	`id` varchar(36) NOT NULL,
	`destination_id` varchar(36) NOT NULL,
	`item` text NOT NULL,
	`sort_order` int NOT NULL DEFAULT 0,
	CONSTRAINT `destination_inclusions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `destination_itineraries` (
	`id` varchar(36) NOT NULL,
	`destination_id` varchar(36) NOT NULL,
	`day_label` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`sort_order` int NOT NULL DEFAULT 0,
	CONSTRAINT `destination_itineraries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `destination_tips` (
	`id` varchar(36) NOT NULL,
	`destination_id` varchar(36) NOT NULL,
	`item` text NOT NULL,
	`sort_order` int NOT NULL DEFAULT 0,
	CONSTRAINT `destination_tips_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `destinations` (
	`id` varchar(36) NOT NULL,
	`name` text NOT NULL,
	`slug` varchar(191) NOT NULL,
	`short_description` text,
	`description` text,
	`hero_image` text,
	`region` text,
	`category` text,
	`difficulty` text,
	`duration` text,
	`altitude_label` text,
	`min_altitude` int,
	`max_altitude` int,
	`elevation` int,
	`best_season` text,
	`cancellation_fee_percentage` decimal(5,2),
	`sort_order` int NOT NULL DEFAULT 0,
	`status` boolean NOT NULL DEFAULT true,
	`seo_title` text,
	`seo_description` text,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `destinations_id` PRIMARY KEY(`id`),
	CONSTRAINT `destinations_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `package_destinations` (
	`id` varchar(36) NOT NULL,
	`package_id` varchar(36) NOT NULL,
	`destination_id` varchar(36) NOT NULL,
	`sort_order` int NOT NULL DEFAULT 0,
	CONSTRAINT `package_destinations_id` PRIMARY KEY(`id`),
	CONSTRAINT `package_destinations_package_destination_unique` UNIQUE(`package_id`,`destination_id`)
);
--> statement-breakpoint
CREATE TABLE `package_exclusions` (
	`id` varchar(36) NOT NULL,
	`package_id` varchar(36) NOT NULL,
	`item` text NOT NULL,
	`sort_order` int NOT NULL DEFAULT 0,
	CONSTRAINT `package_exclusions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `package_highlights` (
	`id` varchar(36) NOT NULL,
	`package_id` varchar(36) NOT NULL,
	`item` text NOT NULL,
	`sort_order` int NOT NULL DEFAULT 0,
	CONSTRAINT `package_highlights_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `package_inclusions` (
	`id` varchar(36) NOT NULL,
	`package_id` varchar(36) NOT NULL,
	`item` text NOT NULL,
	`sort_order` int NOT NULL DEFAULT 0,
	CONSTRAINT `package_inclusions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `package_itineraries` (
	`id` varchar(36) NOT NULL,
	`package_id` varchar(36) NOT NULL,
	`day` int,
	`day_label` text,
	`title` text NOT NULL,
	`description` text,
	`accommodation` text,
	`meals` text,
	`altitude` int,
	`sort_order` int NOT NULL DEFAULT 0,
	CONSTRAINT `package_itineraries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `package_tiers` (
	`id` varchar(36) NOT NULL,
	`package_id` varchar(36) NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`price` decimal(12,2) NOT NULL,
	`currency` text NOT NULL DEFAULT ('USD'),
	`sort_order` int NOT NULL DEFAULT 0,
	CONSTRAINT `package_tiers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `packages` (
	`id` varchar(36) NOT NULL,
	`destination_id` varchar(36),
	`title` text NOT NULL,
	`slug` varchar(191) NOT NULL,
	`destination_label` text,
	`style` text,
	`short_description` text,
	`description` text,
	`days` int,
	`difficulty` enum('easy','moderate','challenging','extreme'),
	`max_altitude` int,
	`starting_price` decimal(12,2),
	`old_price` decimal(12,2),
	`currency` text NOT NULL DEFAULT ('USD'),
	`cancellation_fee_percentage` decimal(5,2),
	`rating` decimal(3,2),
	`review_count` int NOT NULL DEFAULT 0,
	`hero_image` text,
	`sort_order` int NOT NULL DEFAULT 0,
	`status` boolean NOT NULL DEFAULT true,
	`featured` boolean NOT NULL DEFAULT false,
	`seo_title` text,
	`seo_description` text,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `packages_id` PRIMARY KEY(`id`),
	CONSTRAINT `packages_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `booking_intents` (
	`id` varchar(36) NOT NULL,
	`checkout_reference` varchar(64) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`package_id` varchar(36) NOT NULL,
	`package_tier_id` varchar(36) NOT NULL,
	`departure_date` date NOT NULL,
	`travellers` int NOT NULL,
	`primary_traveller_first_name` text NOT NULL,
	`primary_traveller_last_name` text NOT NULL,
	`primary_traveller_email` text NOT NULL,
	`primary_traveller_phone` text NOT NULL,
	`primary_traveller_nationality` text,
	`primary_traveller_date_of_birth` date,
	`notes` text,
	`unit_price_snapshot` decimal(12,2) NOT NULL,
	`subtotal` decimal(12,2) NOT NULL,
	`vat_enabled_snapshot` boolean NOT NULL,
	`vat_percentage_snapshot` decimal(5,2) NOT NULL,
	`vat_amount` decimal(12,2) NOT NULL,
	`grand_total` decimal(12,2) NOT NULL,
	`minimum_deposit_percentage_snapshot` decimal(5,2) NOT NULL,
	`minimum_deposit_amount` decimal(12,2) NOT NULL,
	`balance_due_days_snapshot` int NOT NULL,
	`cancellation_fee_percentage_snapshot` decimal(5,2) NOT NULL,
	`cancellation_policy_source_snapshot` text,
	`staged_document_type` text,
	`staged_document_storage_key` text,
	`staged_document_original_filename` text,
	`staged_document_mime_type` text,
	`staged_document_file_size` int,
	`currency` text NOT NULL,
	`selected_payment_option` enum('minimum','full') NOT NULL DEFAULT 'minimum',
	`status` enum('open','consumed','expired','cancelled') NOT NULL DEFAULT 'open',
	`expires_at` datetime(3) NOT NULL,
	`consumed_at` datetime(3),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `booking_intents_id` PRIMARY KEY(`id`),
	CONSTRAINT `booking_intents_checkout_reference_unique` UNIQUE(`checkout_reference`)
);
--> statement-breakpoint
CREATE TABLE `booking_travellers` (
	`id` varchar(36) NOT NULL,
	`booking_id` varchar(36) NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`email` text,
	`phone` text,
	`nationality` text,
	`date_of_birth` date,
	`special_requirements` text,
	CONSTRAINT `booking_travellers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `bookings` (
	`id` varchar(36) NOT NULL,
	`booking_reference` varchar(64) NOT NULL,
	`checkout_intent_id` varchar(36),
	`user_id` varchar(36) NOT NULL,
	`package_id` varchar(36) NOT NULL,
	`package_tier_id` varchar(36),
	`departure_date` date,
	`travellers` int NOT NULL DEFAULT 1,
	`status` enum('pending','confirmed','cancelled','completed') NOT NULL DEFAULT 'confirmed',
	`unit_price_snapshot` decimal(12,2),
	`subtotal` decimal(12,2),
	`vat_percentage_snapshot` decimal(5,2),
	`vat_amount_snapshot` decimal(12,2),
	`total` decimal(12,2),
	`minimum_deposit_percentage_snapshot` decimal(5,2),
	`minimum_deposit_amount_snapshot` decimal(12,2),
	`initial_payment_option` enum('minimum','full'),
	`initial_payment_percentage_snapshot` decimal(5,2),
	`amount_initially_paid` decimal(12,2),
	`remaining_balance_snapshot` decimal(12,2),
	`balance_due_date` date,
	`cancellation_fee_percentage_snapshot` decimal(5,2),
	`cancellation_policy_source_snapshot` text,
	`cancellation_fee_amount` decimal(12,2),
	`refund_amount` decimal(12,2),
	`cancelled_at` datetime(3),
	`cancellation_reason` text,
	`currency` text NOT NULL DEFAULT ('USD'),
	`notes` text,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `bookings_id` PRIMARY KEY(`id`),
	CONSTRAINT `bookings_booking_reference_unique` UNIQUE(`booking_reference`),
	CONSTRAINT `bookings_checkout_intent_id_unique` UNIQUE(`checkout_intent_id`)
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` varchar(36) NOT NULL,
	`booking_id` varchar(36) NOT NULL,
	`purpose` enum('deposit','full','balance','additional','refund'),
	`amount` decimal(12,2) NOT NULL,
	`currency` text NOT NULL DEFAULT ('USD'),
	`provider` varchar(64),
	`provider_transaction_id` varchar(191),
	`status` enum('pending','processing','paid','failed','refunded') NOT NULL DEFAULT 'pending',
	`verified_at` datetime(3),
	`paid_at` datetime(3),
	`failure_reason` text,
	`metadata` text,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `payments_id` PRIMARY KEY(`id`),
	CONSTRAINT `payments_provider_transaction_unique` UNIQUE(`provider`,`provider_transaction_id`)
);
--> statement-breakpoint
CREATE TABLE `lead_activities` (
	`id` varchar(36) NOT NULL,
	`lead_id` varchar(36) NOT NULL,
	`user_id` varchar(36),
	`type` text NOT NULL,
	`description` text,
	`metadata` text,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `lead_activities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `leads` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36),
	`package_id` varchar(36),
	`type` enum('itinerary_request','brochure_request','expert_request','package_inquiry','contact') NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`phone` text,
	`travel_date` date,
	`travellers` int,
	`message` text,
	`status` enum('new','contacted','qualified','proposal','booked','lost','closed') NOT NULL DEFAULT 'new',
	`source` text,
	`assigned_to` varchar(36),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `leads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `media` (
	`id` varchar(36) NOT NULL,
	`type` enum('image','video') NOT NULL,
	`url` text NOT NULL,
	`thumbnail_url` text,
	`alt_text` text,
	`title` text,
	`caption` text,
	`provider` text,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `media_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `blog_categories` (
	`id` varchar(36) NOT NULL,
	`name` text NOT NULL,
	`slug` varchar(191) NOT NULL,
	CONSTRAINT `blog_categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `blog_categories_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `blog_posts` (
	`id` varchar(36) NOT NULL,
	`category_id` varchar(36),
	`title` text NOT NULL,
	`slug` varchar(191) NOT NULL,
	`excerpt` text,
	`content` text,
	`cover_image` text,
	`author_name` text,
	`author_role` text,
	`reading_time_minutes` int,
	`status` text NOT NULL DEFAULT ('draft'),
	`seo_title` text,
	`seo_description` text,
	`published_at` datetime(3),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `blog_posts_id` PRIMARY KEY(`id`),
	CONSTRAINT `blog_posts_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `faqs` (
	`id` varchar(36) NOT NULL,
	`question` text NOT NULL,
	`answer` text NOT NULL,
	`category` text,
	`sort_order` text NOT NULL DEFAULT ('0'),
	`status` text NOT NULL DEFAULT ('published'),
	CONSTRAINT `faqs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `site_settings` (
	`id` varchar(36) NOT NULL,
	`key` varchar(191) NOT NULL,
	`value` text,
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `site_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `site_settings_key_unique` UNIQUE(`key`)
);
--> statement-breakpoint
CREATE TABLE `testimonials` (
	`id` varchar(36) NOT NULL,
	`name` text NOT NULL,
	`location` text,
	`content` text NOT NULL,
	`rating` text,
	`trip_name` text,
	`avatar_url` text,
	`sort_order` int NOT NULL DEFAULT 0,
	`status` text NOT NULL DEFAULT ('published'),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `testimonials_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` varchar(36) NOT NULL,
	`token_hash` varchar(64) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`expires_at` datetime(3) NOT NULL,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`revoked_at` datetime(3),
	CONSTRAINT `sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `sessions_token_hash_unique` UNIQUE(`token_hash`)
);
--> statement-breakpoint
CREATE TABLE `password_reset_tokens` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`token_hash` varchar(64) NOT NULL,
	`expires_at` datetime(3) NOT NULL,
	`used_at` datetime(3),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `password_reset_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `password_reset_tokens_token_hash_unique` UNIQUE(`token_hash`)
);
--> statement-breakpoint
CREATE TABLE `booking_identity_documents` (
	`id` varchar(36) NOT NULL,
	`booking_id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`document_type` enum('passport','national_id') NOT NULL,
	`storage_key` varchar(191) NOT NULL,
	`original_filename` text NOT NULL,
	`mime_type` text NOT NULL,
	`file_size` int NOT NULL,
	`verification_status` enum('pending','verified','rejected') NOT NULL DEFAULT 'pending',
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `booking_identity_documents_id` PRIMARY KEY(`id`),
	CONSTRAINT `booking_identity_documents_booking_id_unique` UNIQUE(`booking_id`),
	CONSTRAINT `booking_identity_documents_storage_key_unique` UNIQUE(`storage_key`)
);
--> statement-breakpoint
CREATE TABLE `user_identity_documents` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`document_type` enum('passport','national_id') NOT NULL,
	`storage_key` varchar(191) NOT NULL,
	`original_filename` text NOT NULL,
	`mime_type` text NOT NULL,
	`file_size` int NOT NULL,
	`verification_status` enum('pending','verified','rejected') NOT NULL DEFAULT 'pending',
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `user_identity_documents_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_identity_documents_storage_key_unique` UNIQUE(`storage_key`)
);
--> statement-breakpoint
ALTER TABLE `destination_exclusions` ADD CONSTRAINT `destination_exclusions_destination_id_destinations_id_fk` FOREIGN KEY (`destination_id`) REFERENCES `destinations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `destination_highlights` ADD CONSTRAINT `destination_highlights_destination_id_destinations_id_fk` FOREIGN KEY (`destination_id`) REFERENCES `destinations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `destination_inclusions` ADD CONSTRAINT `destination_inclusions_destination_id_destinations_id_fk` FOREIGN KEY (`destination_id`) REFERENCES `destinations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `destination_itineraries` ADD CONSTRAINT `destination_itineraries_destination_id_destinations_id_fk` FOREIGN KEY (`destination_id`) REFERENCES `destinations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `destination_tips` ADD CONSTRAINT `destination_tips_destination_id_destinations_id_fk` FOREIGN KEY (`destination_id`) REFERENCES `destinations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `package_destinations` ADD CONSTRAINT `package_destinations_package_id_packages_id_fk` FOREIGN KEY (`package_id`) REFERENCES `packages`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `package_destinations` ADD CONSTRAINT `package_destinations_destination_id_destinations_id_fk` FOREIGN KEY (`destination_id`) REFERENCES `destinations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `package_exclusions` ADD CONSTRAINT `package_exclusions_package_id_packages_id_fk` FOREIGN KEY (`package_id`) REFERENCES `packages`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `package_highlights` ADD CONSTRAINT `package_highlights_package_id_packages_id_fk` FOREIGN KEY (`package_id`) REFERENCES `packages`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `package_inclusions` ADD CONSTRAINT `package_inclusions_package_id_packages_id_fk` FOREIGN KEY (`package_id`) REFERENCES `packages`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `package_itineraries` ADD CONSTRAINT `package_itineraries_package_id_packages_id_fk` FOREIGN KEY (`package_id`) REFERENCES `packages`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `package_tiers` ADD CONSTRAINT `package_tiers_package_id_packages_id_fk` FOREIGN KEY (`package_id`) REFERENCES `packages`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `packages` ADD CONSTRAINT `packages_destination_id_destinations_id_fk` FOREIGN KEY (`destination_id`) REFERENCES `destinations`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `booking_intents` ADD CONSTRAINT `booking_intents_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `booking_intents` ADD CONSTRAINT `booking_intents_package_id_packages_id_fk` FOREIGN KEY (`package_id`) REFERENCES `packages`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `booking_intents` ADD CONSTRAINT `booking_intents_package_tier_id_package_tiers_id_fk` FOREIGN KEY (`package_tier_id`) REFERENCES `package_tiers`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `booking_travellers` ADD CONSTRAINT `booking_travellers_booking_id_bookings_id_fk` FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bookings` ADD CONSTRAINT `bookings_checkout_intent_id_booking_intents_id_fk` FOREIGN KEY (`checkout_intent_id`) REFERENCES `booking_intents`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bookings` ADD CONSTRAINT `bookings_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bookings` ADD CONSTRAINT `bookings_package_id_packages_id_fk` FOREIGN KEY (`package_id`) REFERENCES `packages`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bookings` ADD CONSTRAINT `bookings_package_tier_id_package_tiers_id_fk` FOREIGN KEY (`package_tier_id`) REFERENCES `package_tiers`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payments` ADD CONSTRAINT `payments_booking_id_bookings_id_fk` FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lead_activities` ADD CONSTRAINT `lead_activities_lead_id_leads_id_fk` FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lead_activities` ADD CONSTRAINT `lead_activities_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `leads` ADD CONSTRAINT `leads_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `leads` ADD CONSTRAINT `leads_package_id_packages_id_fk` FOREIGN KEY (`package_id`) REFERENCES `packages`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `leads` ADD CONSTRAINT `leads_assigned_to_users_id_fk` FOREIGN KEY (`assigned_to`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `blog_posts` ADD CONSTRAINT `blog_posts_category_id_blog_categories_id_fk` FOREIGN KEY (`category_id`) REFERENCES `blog_categories`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `password_reset_tokens` ADD CONSTRAINT `password_reset_tokens_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `booking_identity_documents` ADD CONSTRAINT `booking_identity_documents_booking_id_bookings_id_fk` FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `booking_identity_documents` ADD CONSTRAINT `booking_identity_documents_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_identity_documents` ADD CONSTRAINT `user_identity_documents_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `booking_intents_user_status_idx` ON `booking_intents` (`user_id`,`status`);--> statement-breakpoint
CREATE INDEX `booking_intents_expires_at_idx` ON `booking_intents` (`expires_at`);--> statement-breakpoint
CREATE INDEX `payments_booking_created_idx` ON `payments` (`booking_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `sessions_user_id_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `sessions_expires_at_idx` ON `sessions` (`expires_at`);--> statement-breakpoint
CREATE INDEX `password_reset_tokens_user_id_idx` ON `password_reset_tokens` (`user_id`);--> statement-breakpoint
CREATE INDEX `password_reset_tokens_expires_at_idx` ON `password_reset_tokens` (`expires_at`);--> statement-breakpoint
CREATE INDEX `booking_identity_documents_user_id_idx` ON `booking_identity_documents` (`user_id`);--> statement-breakpoint
CREATE INDEX `user_identity_documents_user_id_idx` ON `user_identity_documents` (`user_id`);