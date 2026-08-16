CREATE TABLE `email_verification_challenges` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`code_hash` text NOT NULL,
	`token_hash` varchar(64) NOT NULL,
	`expires_at` datetime(3) NOT NULL,
	`attempt_count` int NOT NULL DEFAULT 0,
	`used_at` datetime(3),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `email_verification_challenges_id` PRIMARY KEY(`id`),
	CONSTRAINT `email_verification_challenges_token_hash_unique` UNIQUE(`token_hash`)
);
--> statement-breakpoint
ALTER TABLE `email_verification_challenges` ADD CONSTRAINT `email_verification_challenges_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `email_verification_user_created_idx` ON `email_verification_challenges` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `email_verification_expiry_idx` ON `email_verification_challenges` (`expires_at`);--> statement-breakpoint
UPDATE `users`
SET `email_verified_at` = COALESCE(`email_verified_at`, `created_at`, CURRENT_TIMESTAMP(3))
WHERE `email_verified_at` IS NULL;
