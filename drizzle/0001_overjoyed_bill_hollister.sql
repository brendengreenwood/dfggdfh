CREATE TABLE `farmer_contacts` (
	`id` text PRIMARY KEY NOT NULL,
	`farmer_id` text NOT NULL,
	`originator_id` text NOT NULL,
	`contact_type` text NOT NULL,
	`bushels_sold` integer,
	`notes` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`farmer_id`) REFERENCES `farmers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`originator_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `farmers` ADD `originator_id` text;