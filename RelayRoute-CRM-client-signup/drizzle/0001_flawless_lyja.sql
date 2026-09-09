CREATE TABLE `lead_handoffs` (
	`id` text PRIMARY KEY NOT NULL,
	`lead_id` text NOT NULL,
	`vendor_id` text NOT NULL,
	`delivery_method` text DEFAULT 'manual' NOT NULL,
	`status` text DEFAULT 'drafted' NOT NULL,
	`message_snapshot` text NOT NULL,
	`approved_at` text NOT NULL,
	`sent_at` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`vendor_id`) REFERENCES `vendors`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_lead_handoffs_lead` ON `lead_handoffs` (`lead_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `public_rate_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	`expires_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `vendor_applications` (
	`id` text PRIMARY KEY NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`company_name` text NOT NULL,
	`contact_name` text NOT NULL,
	`phone` text NOT NULL,
	`email` text NOT NULL,
	`website` text DEFAULT '' NOT NULL,
	`primary_market` text DEFAULT '' NOT NULL,
	`data_json` text NOT NULL,
	`requirements_json` text DEFAULT '[]' NOT NULL,
	`source` text DEFAULT 'public_vendor_application' NOT NULL,
	`submitted_at` text NOT NULL,
	`reviewed_at` text,
	`reviewed_by` text,
	`created_vendor_id` text,
	FOREIGN KEY (`created_vendor_id`) REFERENCES `vendors`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_vendor_applications_status` ON `vendor_applications` (`status`,`submitted_at`);--> statement-breakpoint
ALTER TABLE `leads` ADD `availability` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `leads` ADD `landing_vendor_id` text REFERENCES vendors(id);--> statement-breakpoint
ALTER TABLE `leads` ADD `landing_vendor_slug` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `leads` ADD `recommended_vendor_id` text REFERENCES vendors(id);--> statement-breakpoint
ALTER TABLE `leads` ADD `public_submission` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `leads` ADD `landing_page` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `leads` ADD `utm_source` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `leads` ADD `utm_medium` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `leads` ADD `utm_campaign` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `leads` ADD `utm_content` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `leads` ADD `utm_term` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `leads` ADD `fbclid` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `leads` ADD `contact_consent_at` text;--> statement-breakpoint
ALTER TABLE `leads` ADD `possible_duplicate_of` text;--> statement-breakpoint
CREATE INDEX `idx_leads_recommended_vendor` ON `leads` (`recommended_vendor_id`);--> statement-breakpoint
CREATE INDEX `idx_leads_landing_vendor` ON `leads` (`landing_vendor_id`);--> statement-breakpoint
ALTER TABLE `vendors` ADD `public_slug` text;--> statement-breakpoint
ALTER TABLE `vendors` ADD `public_form_enabled` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `vendors` ADD `show_vendor_branding` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `vendors` ADD `lead_delivery_mode` text DEFAULT 'manual' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_vendors_public_slug` ON `vendors` (`public_slug`);