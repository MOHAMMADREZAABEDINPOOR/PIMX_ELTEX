CREATE TABLE `site_visits` (
	`id` text PRIMARY KEY NOT NULL,
	`visitor_hash` text NOT NULL,
	`user_id` text,
	`path` text NOT NULL,
	`country_code` text(2),
	`city` text,
	`region` text,
	`device_type` text,
	`operating_system` text,
	`browser` text,
	`ip_address_ciphertext` text,
	`duration_seconds` integer DEFAULT 0 NOT NULL,
	`last_seen_at` integer DEFAULT (unixepoch()) NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `site_visits_visitor_date_idx` ON `site_visits` (`visitor_hash`,`created_at`);--> statement-breakpoint
CREATE INDEX `site_visits_user_date_idx` ON `site_visits` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `site_visits_country_idx` ON `site_visits` (`country_code`);--> statement-breakpoint
CREATE INDEX `site_visits_device_idx` ON `site_visits` (`device_type`);--> statement-breakpoint
CREATE INDEX `site_visits_path_idx` ON `site_visits` (`path`);--> statement-breakpoint
ALTER TABLE `sessions` ADD `city` text;--> statement-breakpoint
ALTER TABLE `sessions` ADD `region` text;--> statement-breakpoint
ALTER TABLE `sessions` ADD `ip_address_ciphertext` text;--> statement-breakpoint
ALTER TABLE `user_devices` ADD `city` text;--> statement-breakpoint
ALTER TABLE `user_devices` ADD `region` text;--> statement-breakpoint
ALTER TABLE `user_devices` ADD `ip_address_ciphertext` text;--> statement-breakpoint
ALTER TABLE `user_devices` ADD `visit_count` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `user_devices` ADD `total_duration_seconds` integer DEFAULT 0 NOT NULL;