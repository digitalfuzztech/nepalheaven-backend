CREATE TABLE `email_templates` (
	`id` varchar(36) NOT NULL,
	`key` varchar(100) NOT NULL,
	`name` varchar(180) NOT NULL,
	`subject_template` text NOT NULL,
	`html_template` text NOT NULL,
	`text_template` text NOT NULL,
	`status` enum('active','inactive') NOT NULL DEFAULT 'active',
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `email_templates_id` PRIMARY KEY(`id`),
	CONSTRAINT `email_templates_key_unique` UNIQUE(`key`)
);
--> statement-breakpoint
CREATE TABLE `lead_interactions` (
	`id` varchar(36) NOT NULL,
	`lead_id` varchar(36) NOT NULL,
	`channel` enum('web','email','whatsapp') NOT NULL,
	`direction` enum('inbound','outbound','system') NOT NULL,
	`interaction_type` varchar(80) NOT NULL,
	`template_key` varchar(100),
	`subject` text,
	`body` text NOT NULL,
	`from_address` varchar(254),
	`to_address` varchar(254),
	`provider` varchar(80),
	`provider_message_id` text,
	`delivery_status` enum('pending','sent','delivered','failed','received') NOT NULL,
	`failure_reason` text,
	`metadata` text,
	`sent_at` datetime(3),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `lead_interactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `newsletter_subscribers` (
	`id` varchar(36) NOT NULL,
	`email` varchar(254) NOT NULL,
	`user_id` varchar(36),
	`status` enum('active','unsubscribed') NOT NULL DEFAULT 'active',
	`source` enum('homepage','footer','contact','destination','experience','other') NOT NULL,
	`unsubscribe_token_hash` varchar(64) NOT NULL,
	`consented_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`unsubscribed_at` datetime(3),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `newsletter_subscribers_id` PRIMARY KEY(`id`),
	CONSTRAINT `newsletter_subscribers_email_unique` UNIQUE(`email`),
	CONSTRAINT `newsletter_subscribers_token_unique` UNIQUE(`unsubscribe_token_hash`)
);
--> statement-breakpoint
ALTER TABLE `leads` MODIFY COLUMN `type` enum('itinerary_request','brochure_request','expert_request','package_inquiry','contact','newsletter_subscriber','destination_inquiry','experience_inquiry','whatsapp_inquiry') NOT NULL;--> statement-breakpoint
ALTER TABLE `leads` MODIFY COLUMN `email` varchar(254) NOT NULL;--> statement-breakpoint
ALTER TABLE `leads` MODIFY COLUMN `source` varchar(100);--> statement-breakpoint
ALTER TABLE `leads` ADD `destination_id` varchar(36);--> statement-breakpoint
ALTER TABLE `leads` ADD `experience_id` varchar(36);--> statement-breakpoint
ALTER TABLE `leads` ADD `lead_level` int DEFAULT 2 NOT NULL;--> statement-breakpoint
UPDATE `leads` SET `lead_level` = 3 WHERE `type` = 'itinerary_request';--> statement-breakpoint
UPDATE `leads` SET `lead_level` = 3 WHERE `type` = 'itinerary_request';--> statement-breakpoint
ALTER TABLE `leads` ADD `preferred_start_date` date;--> statement-breakpoint
ALTER TABLE `leads` ADD `preferred_end_date` date;--> statement-breakpoint
ALTER TABLE `leads` ADD `interested_in` text;--> statement-breakpoint
ALTER TABLE `leads` ADD `marketing_opt_in` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `leads` ADD `marketing_consent_source` text;--> statement-breakpoint
ALTER TABLE `leads` ADD `marketing_opted_in_at` datetime(3);--> statement-breakpoint
ALTER TABLE `leads` ADD `marketing_opt_out_at` datetime(3);--> statement-breakpoint
ALTER TABLE `lead_interactions` ADD CONSTRAINT `lead_interactions_lead_id_leads_id_fk` FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `newsletter_subscribers` ADD CONSTRAINT `newsletter_subscribers_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `lead_interactions_lead_created_idx` ON `lead_interactions` (`lead_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `lead_interactions_channel_status_idx` ON `lead_interactions` (`channel`,`delivery_status`);--> statement-breakpoint
ALTER TABLE `leads` ADD CONSTRAINT `leads_destination_id_destinations_id_fk` FOREIGN KEY (`destination_id`) REFERENCES `destinations`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `leads` ADD CONSTRAINT `leads_experience_id_experience_categories_id_fk` FOREIGN KEY (`experience_id`) REFERENCES `experience_categories`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `leads_email_idx` ON `leads` (`email`);--> statement-breakpoint
CREATE INDEX `leads_user_id_idx` ON `leads` (`user_id`);--> statement-breakpoint
CREATE INDEX `leads_level_source_idx` ON `leads` (`lead_level`,`source`);
