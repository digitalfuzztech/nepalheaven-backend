CREATE TABLE `experience_categories` (
	`id` varchar(36) NOT NULL,
	`slug` varchar(191) NOT NULL,
	`name` text NOT NULL,
	`short_description` text,
	`description` text,
	`hero_image` text,
	`sort_order` int NOT NULL DEFAULT 0,
	`status` boolean NOT NULL DEFAULT true,
	`seo_title` text,
	`seo_description` text,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `experience_categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `experience_categories_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `experience_highlights` (
	`id` varchar(36) NOT NULL,
	`experience_id` varchar(36) NOT NULL,
	`item` text NOT NULL,
	`sort_order` int NOT NULL DEFAULT 0,
	CONSTRAINT `experience_highlights_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `experience_packages` (
	`id` varchar(36) NOT NULL,
	`experience_id` varchar(36) NOT NULL,
	`package_id` varchar(36) NOT NULL,
	`sort_order` int NOT NULL DEFAULT 0,
	CONSTRAINT `experience_packages_id` PRIMARY KEY(`id`),
	CONSTRAINT `experience_packages_experience_package_unique` UNIQUE(`experience_id`,`package_id`)
);
--> statement-breakpoint
ALTER TABLE `experience_highlights` ADD CONSTRAINT `experience_highlights_experience_id_experience_categories_id_fk` FOREIGN KEY (`experience_id`) REFERENCES `experience_categories`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `experience_packages` ADD CONSTRAINT `experience_packages_experience_id_experience_categories_id_fk` FOREIGN KEY (`experience_id`) REFERENCES `experience_categories`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `experience_packages` ADD CONSTRAINT `experience_packages_package_id_packages_id_fk` FOREIGN KEY (`package_id`) REFERENCES `packages`(`id`) ON DELETE cascade ON UPDATE no action;