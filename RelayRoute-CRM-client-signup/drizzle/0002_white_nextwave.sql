CREATE TABLE `lead_documents` (
	`id` text PRIMARY KEY NOT NULL,
	`lead_id` text NOT NULL,
	`kind` text NOT NULL,
	`original_name` text NOT NULL,
	`object_key` text NOT NULL,
	`content_type` text NOT NULL,
	`size` integer NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_lead_documents_lead` ON `lead_documents` (`lead_id`,`created_at`);