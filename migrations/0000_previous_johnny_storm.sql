CREATE TABLE "recordings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"status" varchar(32) DEFAULT 'active' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"active_version_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "recording_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recording_id" uuid NOT NULL,
	"version_number" integer NOT NULL,
	"source" varchar(64) DEFAULT 'extension' NOT NULL,
	"schema_version" varchar(32) NOT NULL,
	"title" varchar(255),
	"start_url" text,
	"step_count" integer DEFAULT 0 NOT NULL,
	"recording_json" jsonb NOT NULL,
	"raw_event_summary" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"validation" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "run_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recording_id" uuid NOT NULL,
	"version_id" uuid,
	"type" varchar(32) DEFAULT 'replay' NOT NULL,
	"status" varchar(32) NOT NULL,
	"started_at" timestamp with time zone,
	"ended_at" timestamp with time zone,
	"duration_ms" integer,
	"environment" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"summary" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"error" jsonb,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "run_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"sequence" integer NOT NULL,
	"type" varchar(64) NOT NULL,
	"timestamp" timestamp with time zone,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "recording_versions" ADD CONSTRAINT "recording_versions_recording_id_recordings_id_fk" FOREIGN KEY ("recording_id") REFERENCES "public"."recordings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "run_history" ADD CONSTRAINT "run_history_recording_id_recordings_id_fk" FOREIGN KEY ("recording_id") REFERENCES "public"."recordings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "run_history" ADD CONSTRAINT "run_history_version_id_recording_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."recording_versions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "run_events" ADD CONSTRAINT "run_events_run_id_run_history_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."run_history"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "recordings_status_idx" ON "recordings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "recordings_created_at_idx" ON "recordings" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "recording_versions_recording_id_version_number_idx" ON "recording_versions" USING btree ("recording_id","version_number");--> statement-breakpoint
CREATE INDEX "recording_versions_recording_id_idx" ON "recording_versions" USING btree ("recording_id");--> statement-breakpoint
CREATE INDEX "recording_versions_created_at_idx" ON "recording_versions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "run_history_recording_id_idx" ON "run_history" USING btree ("recording_id");--> statement-breakpoint
CREATE INDEX "run_history_version_id_idx" ON "run_history" USING btree ("version_id");--> statement-breakpoint
CREATE INDEX "run_history_created_at_idx" ON "run_history" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "run_history_status_idx" ON "run_history" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "run_events_run_id_sequence_idx" ON "run_events" USING btree ("run_id","sequence");--> statement-breakpoint
CREATE INDEX "run_events_run_id_idx" ON "run_events" USING btree ("run_id");