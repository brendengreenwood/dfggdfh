CREATE TABLE `alerts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`alert_type` text NOT NULL,
	`title` text NOT NULL,
	`body` text,
	`elevator_id` text,
	`farmer_id` text,
	`data` text,
	`is_read` integer DEFAULT false NOT NULL,
	`acted_on` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`elevator_id`) REFERENCES `elevators`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`farmer_id`) REFERENCES `farmers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `behavioral_events` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`event_type` text NOT NULL,
	`view` text,
	`duration_ms` integer,
	`metadata` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `contracts` (
	`id` text PRIMARY KEY NOT NULL,
	`farmer_id` text NOT NULL,
	`elevator_id` text NOT NULL,
	`originated_by` text NOT NULL,
	`crop` text NOT NULL,
	`crop_year` integer NOT NULL,
	`delivery_month` text NOT NULL,
	`bushels` integer NOT NULL,
	`basis` real,
	`futures_price` real,
	`ml_basis_rec` real,
	`basis_delta` real,
	`status` text DEFAULT 'OPEN' NOT NULL,
	`contracted_at` text,
	`delivery_start` text,
	`delivery_end` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`farmer_id`) REFERENCES `farmers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`elevator_id`) REFERENCES `elevators`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`originated_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `elevators` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`code` text NOT NULL,
	`region` text NOT NULL,
	`lat` real,
	`lng` real,
	`capacity_bu` integer,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `elevators_code_unique` ON `elevators` (`code`);--> statement-breakpoint
CREATE TABLE `farmers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`phone` text,
	`email` text,
	`salesforce_id` text,
	`region` text,
	`lat` real,
	`lng` real,
	`preferred_crop` text,
	`total_acres` integer,
	`notes` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `farmers_salesforce_id_unique` ON `farmers` (`salesforce_id`);--> statement-breakpoint
CREATE TABLE `feedback_responses` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`prompt_type` text NOT NULL,
	`response` text,
	`response_value` text,
	`context` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `leads` (
	`id` text PRIMARY KEY NOT NULL,
	`farmer_id` text NOT NULL,
	`elevator_id` text NOT NULL,
	`assigned_to` text NOT NULL,
	`ml_score` real NOT NULL,
	`ml_rank` integer,
	`crop` text,
	`estimated_bu` integer,
	`recommended_basis` real,
	`competitor_spread` real,
	`distance_to_competitor_mi` real,
	`crop_stress_score` real,
	`last_contact_at` text,
	`last_contact_note` text,
	`outcome` text DEFAULT 'PENDING' NOT NULL,
	`outcome_basis` real,
	`outcome_bu` integer,
	`outcome_note` text,
	`outcome_at` text,
	`week_of` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`farmer_id`) REFERENCES `farmers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`elevator_id`) REFERENCES `elevators`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`assigned_to`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `ml_overrides` (
	`id` text PRIMARY KEY NOT NULL,
	`recommendation_id` text NOT NULL,
	`user_id` text NOT NULL,
	`original_rec` real NOT NULL,
	`posted_value` real NOT NULL,
	`delta` real NOT NULL,
	`reason_category` text,
	`reason_note` text,
	`overridden_at` text NOT NULL,
	FOREIGN KEY (`recommendation_id`) REFERENCES `ml_recommendations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `ml_recommendations` (
	`id` text PRIMARY KEY NOT NULL,
	`rec_type` text NOT NULL,
	`user_id` text,
	`elevator_id` text,
	`farmer_id` text,
	`crop` text,
	`delivery_month` text,
	`crop_year` integer,
	`recommended_value` real NOT NULL,
	`reasoning` text,
	`competitor_signal` text,
	`crop_stress_signal` text,
	`position_signal` text,
	`market_signal` text,
	`confidence` real,
	`generated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`elevator_id`) REFERENCES `elevators`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`farmer_id`) REFERENCES `farmers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `position_summary` (
	`id` text PRIMARY KEY NOT NULL,
	`elevator_id` text NOT NULL,
	`user_id` text NOT NULL,
	`crop` text NOT NULL,
	`delivery_month` text NOT NULL,
	`crop_year` integer NOT NULL,
	`bushels_physical` integer NOT NULL,
	`bushels_futures` integer NOT NULL,
	`net_position` integer NOT NULL,
	`coverage_target` integer,
	`coverage_gap` integer,
	`current_basis` real,
	`ml_basis_rec` real,
	`basis_delta` real,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`elevator_id`) REFERENCES `elevators`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`persona` text NOT NULL,
	`region` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);