CREATE TABLE `position_changes` (
	`id` text PRIMARY KEY NOT NULL,
	`position_id` text NOT NULL,
	`lead_id` text,
	`farmer_name` text,
	`originator_name` text,
	`bushels` integer NOT NULL,
	`basis` real,
	`coverage_before` real,
	`coverage_after` real,
	`created_at` text NOT NULL,
	FOREIGN KEY (`position_id`) REFERENCES `position_summary`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE no action
);
