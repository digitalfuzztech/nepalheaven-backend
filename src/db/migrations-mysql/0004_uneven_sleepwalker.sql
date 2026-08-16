CREATE TABLE `whatsapp_attributions` (
	`id` varchar(36) NOT NULL,
	`token_hash` varchar(64) NOT NULL,
	`source` enum('website_whatsapp','meta_whatsapp_ad') NOT NULL,
	`context_type` enum('homepage','destination','experience','package','other'),
	`context_slug` varchar(191),
	`destination_id` varchar(36),
	`experience_id` varchar(36),
	`package_id` varchar(36),
	`matched_lead_id` varchar(36),
	`status` enum('pending','matched','expired') NOT NULL DEFAULT 'pending',
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`matched_at` datetime(3),
	`expires_at` datetime(3),
	`metadata` text,
	CONSTRAINT `whatsapp_attributions_id` PRIMARY KEY(`id`),
	CONSTRAINT `whatsapp_attributions_token_unique` UNIQUE(`token_hash`)
);
--> statement-breakpoint
ALTER TABLE `leads` MODIFY COLUMN `email` varchar(254);--> statement-breakpoint
ALTER TABLE `lead_interactions` MODIFY COLUMN `lead_id` varchar(36);--> statement-breakpoint
ALTER TABLE `lead_interactions` ADD `acquisition_source` varchar(80);--> statement-breakpoint
ALTER TABLE `lead_interactions` ADD `context_type` varchar(40);--> statement-breakpoint
ALTER TABLE `lead_interactions` ADD `context_slug` varchar(191);--> statement-breakpoint
ALTER TABLE `lead_interactions` ADD `automatic_lead` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `whatsapp_attributions` ADD CONSTRAINT `whatsapp_attributions_destination_id_destinations_id_fk` FOREIGN KEY (`destination_id`) REFERENCES `destinations`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `whatsapp_attributions` ADD CONSTRAINT `whatsapp_attributions_experience_id_experience_categories_id_fk` FOREIGN KEY (`experience_id`) REFERENCES `experience_categories`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `whatsapp_attributions` ADD CONSTRAINT `whatsapp_attributions_package_id_packages_id_fk` FOREIGN KEY (`package_id`) REFERENCES `packages`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `whatsapp_attributions` ADD CONSTRAINT `whatsapp_attributions_matched_lead_id_leads_id_fk` FOREIGN KEY (`matched_lead_id`) REFERENCES `leads`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `whatsapp_attributions_status_expiry_idx` ON `whatsapp_attributions` (`status`,`expires_at`);--> statement-breakpoint
CREATE INDEX `lead_interactions_channel_from_idx` ON `lead_interactions` (`channel`,`from_address`);