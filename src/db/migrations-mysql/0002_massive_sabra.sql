CREATE TABLE `blog_comments` (
	`id` varchar(36) NOT NULL,
	`blog_post_id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`content` text NOT NULL,
	`status` enum('published','pending','hidden') NOT NULL DEFAULT 'published',
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `blog_comments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `blog_likes` (
	`id` varchar(36) NOT NULL,
	`blog_post_id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `blog_likes_id` PRIMARY KEY(`id`),
	CONSTRAINT `blog_likes_post_user_unique` UNIQUE(`blog_post_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE `blog_ratings` (
	`id` varchar(36) NOT NULL,
	`blog_post_id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`rating` tinyint unsigned NOT NULL,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `blog_ratings_id` PRIMARY KEY(`id`),
	CONSTRAINT `blog_ratings_post_user_unique` UNIQUE(`blog_post_id`,`user_id`),
	CONSTRAINT `blog_ratings_rating_check` CHECK(`blog_ratings`.`rating` between 1 and 5)
);
--> statement-breakpoint
ALTER TABLE `blog_comments` ADD CONSTRAINT `blog_comments_blog_post_id_blog_posts_id_fk` FOREIGN KEY (`blog_post_id`) REFERENCES `blog_posts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `blog_comments` ADD CONSTRAINT `blog_comments_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `blog_likes` ADD CONSTRAINT `blog_likes_blog_post_id_blog_posts_id_fk` FOREIGN KEY (`blog_post_id`) REFERENCES `blog_posts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `blog_likes` ADD CONSTRAINT `blog_likes_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `blog_ratings` ADD CONSTRAINT `blog_ratings_blog_post_id_blog_posts_id_fk` FOREIGN KEY (`blog_post_id`) REFERENCES `blog_posts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `blog_ratings` ADD CONSTRAINT `blog_ratings_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;