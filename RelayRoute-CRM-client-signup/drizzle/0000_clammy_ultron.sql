CREATE TABLE `capacity_overrides` (
	`id` text PRIMARY KEY NOT NULL,
	`vendor_id` text NOT NULL,
	`date` text NOT NULL,
	`max_leads` integer NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	FOREIGN KEY (`vendor_id`) REFERENCES `vendors`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_capacity_override_vendor_date` ON `capacity_overrides` (`vendor_id`,`date`);--> statement-breakpoint
CREATE TABLE `conversion_events` (
	`id` text PRIMARY KEY NOT NULL,
	`lead_id` text NOT NULL,
	`vendor_id` text,
	`event_type` text NOT NULL,
	`source` text DEFAULT 'manual' NOT NULL,
	`external_event_id` text,
	`occurred_at` text NOT NULL,
	`payload_json` text DEFAULT '{}' NOT NULL,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`vendor_id`) REFERENCES `vendors`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_conversion_events_lead` ON `conversion_events` (`lead_id`,`occurred_at`);--> statement-breakpoint
CREATE TABLE `lead_activities` (
	`id` text PRIMARY KEY NOT NULL,
	`lead_id` text NOT NULL,
	`actor_user_id` text NOT NULL,
	`type` text NOT NULL,
	`description` text NOT NULL,
	`metadata_json` text DEFAULT '{}' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_lead_activities_lead` ON `lead_activities` (`lead_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `lead_requirement_answers` (
	`id` text PRIMARY KEY NOT NULL,
	`lead_id` text NOT NULL,
	`requirement_key` text NOT NULL,
	`value_json` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_lead_answer_key` ON `lead_requirement_answers` (`lead_id`,`requirement_key`);--> statement-breakpoint
CREATE TABLE `leads` (
	`id` text PRIMARY KEY NOT NULL,
	`display_id` integer NOT NULL,
	`owner_user_id` text NOT NULL,
	`source` text DEFAULT 'Facebook Messenger' NOT NULL,
	`campaign` text DEFAULT '' NOT NULL,
	`marketplace` text DEFAULT '' NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text DEFAULT '' NOT NULL,
	`phone` text NOT NULL,
	`email` text DEFAULT '' NOT NULL,
	`zip` text NOT NULL,
	`city` text DEFAULT '' NOT NULL,
	`address` text DEFAULT '' NOT NULL,
	`desired_timeframe` text DEFAULT '' NOT NULL,
	`current_appliance` text DEFAULT '' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`assigned_vendor_id` text,
	`recommendation_score` real DEFAULT 0 NOT NULL,
	`sent_at` text,
	`signup_url_snapshot` text,
	`payment_setup_status` text DEFAULT 'not_started' NOT NULL,
	`status` text DEFAULT 'new' NOT NULL,
	`lost_reason` text DEFAULT '' NOT NULL,
	`expected_monthly_revenue` real DEFAULT 0 NOT NULL,
	`actual_monthly_revenue` real,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`assigned_vendor_id`) REFERENCES `vendors`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_leads_display_id` ON `leads` (`display_id`);--> statement-breakpoint
CREATE INDEX `idx_leads_phone` ON `leads` (`phone`);--> statement-breakpoint
CREATE INDEX `idx_leads_zip` ON `leads` (`zip`);--> statement-breakpoint
CREATE INDEX `idx_leads_status` ON `leads` (`status`);--> statement-breakpoint
CREATE INDEX `idx_leads_vendor` ON `leads` (`assigned_vendor_id`);--> statement-breakpoint
CREATE TABLE `routing_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`capacity_weight` real DEFAULT 30 NOT NULL,
	`priority_weight` real DEFAULT 20 NOT NULL,
	`revenue_weight` real DEFAULT 20 NOT NULL,
	`conversion_weight` real DEFAULT 15 NOT NULL,
	`reliability_weight` real DEFAULT 10 NOT NULL,
	`preferred_weight` real DEFAULT 5 NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `vendor_requirements` (
	`id` text PRIMARY KEY NOT NULL,
	`vendor_id` text NOT NULL,
	`key` text NOT NULL,
	`name` text NOT NULL,
	`question` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`type` text DEFAULT 'boolean' NOT NULL,
	`required` integer DEFAULT true NOT NULL,
	`options_json` text DEFAULT '[]' NOT NULL,
	`qualifying_json` text DEFAULT '[]' NOT NULL,
	`disqualifying_json` text DEFAULT '[]' NOT NULL,
	`customer_label` text DEFAULT '' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`vendor_id`) REFERENCES `vendors`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_vendor_requirement_key` ON `vendor_requirements` (`vendor_id`,`key`);--> statement-breakpoint
CREATE TABLE `vendor_service_zips` (
	`id` text PRIMARY KEY NOT NULL,
	`vendor_id` text NOT NULL,
	`zip` text NOT NULL,
	FOREIGN KEY (`vendor_id`) REFERENCES `vendors`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_vendor_service_zip_unique` ON `vendor_service_zips` (`vendor_id`,`zip`);--> statement-breakpoint
CREATE INDEX `idx_vendor_service_zip_zip` ON `vendor_service_zips` (`zip`);--> statement-breakpoint
CREATE TABLE `vendors` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`contact_name` text,
	`phone` text,
	`email` text,
	`website` text,
	`active` integer DEFAULT true NOT NULL,
	`preferred` integer DEFAULT false NOT NULL,
	`cities` text DEFAULT '' NOT NULL,
	`max_leads_day` integer DEFAULT 5 NOT NULL,
	`max_leads_week` integer,
	`customer_monthly_price` real DEFAULT 0 NOT NULL,
	`fulfillment_cost` real DEFAULT 0 NOT NULL,
	`one_time_revenue` real DEFAULT 0 NOT NULL,
	`recurring_revenue` real DEFAULT 0 NOT NULL,
	`commission_percent` real DEFAULT 0 NOT NULL,
	`revenue_model` text DEFAULT 'recurring' NOT NULL,
	`minimum_term_months` integer,
	`deposit_amount` real DEFAULT 0 NOT NULL,
	`delivery_fee` real DEFAULT 0 NOT NULL,
	`installation_fee` real DEFAULT 0 NOT NULL,
	`supports_electric` integer DEFAULT true NOT NULL,
	`supports_gas` integer DEFAULT false NOT NULL,
	`stackable_available` integer DEFAULT false NOT NULL,
	`stairs_allowed` integer DEFAULT true NOT NULL,
	`max_flights` integer,
	`signup_url` text,
	`tracking_url` text,
	`notes` text DEFAULT '' NOT NULL,
	`priority` integer DEFAULT 50 NOT NULL,
	`reliability` integer DEFAULT 80 NOT NULL,
	`conversion_rate` real DEFAULT 0 NOT NULL,
	`partnership_started` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
