CREATE TABLE "contributors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"seq" serial NOT NULL,
	"handle" text,
	"key_hash" text NOT NULL,
	"trust" text DEFAULT 'member' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"actor_id" uuid,
	"action" text NOT NULL,
	"subject" text NOT NULL,
	"detail" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "proposal_support" (
	"proposal_id" text NOT NULL,
	"contributor_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "proposals" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"question_id" text NOT NULL,
	"prompt" text NOT NULL,
	"outcomes" text NOT NULL,
	"why" text NOT NULL,
	"sources" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"contributor_id" uuid NOT NULL,
	"ip_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "runs" (
	"id" text PRIMARY KEY NOT NULL,
	"test_id" text NOT NULL,
	"test_version" integer NOT NULL,
	"product_id" text NOT NULL,
	"model_label" text DEFAULT '' NOT NULL,
	"surface" text NOT NULL,
	"personalization" text DEFAULT 'unknown' NOT NULL,
	"receipt_url" text,
	"receipt_kind" text NOT NULL,
	"receipt_status" text NOT NULL,
	"responses" jsonb NOT NULL,
	"excerpt" text DEFAULT '' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"submitter_outcome" text NOT NULL,
	"consensus_outcome" text,
	"status" text DEFAULT 'unverified' NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"contributor_id" uuid NOT NULL,
	"ip_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"verified_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" text NOT NULL,
	"contributor_id" uuid NOT NULL,
	"receipt_check" text NOT NULL,
	"outcome" text,
	"flag" text DEFAULT 'none' NOT NULL,
	"ip_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "work_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"work_id" text NOT NULL,
	"contributor_id" uuid NOT NULL,
	"decision" text NOT NULL,
	"reason" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "works" (
	"id" text PRIMARY KEY NOT NULL,
	"url" text NOT NULL,
	"title" text NOT NULL,
	"creators" text DEFAULT '' NOT NULL,
	"publisher" text DEFAULT '' NOT NULL,
	"published" text DEFAULT '' NOT NULL,
	"type" text NOT NULL,
	"questions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"level" text DEFAULT 'curious' NOT NULL,
	"summary" text NOT NULL,
	"caveat" text DEFAULT '' NOT NULL,
	"key" boolean DEFAULT false NOT NULL,
	"status" text NOT NULL,
	"source" text NOT NULL,
	"submitted_by" uuid,
	"ip_hash" text,
	"checked_on" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"listed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_actor_id_contributors_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."contributors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposal_support" ADD CONSTRAINT "proposal_support_proposal_id_proposals_id_fk" FOREIGN KEY ("proposal_id") REFERENCES "public"."proposals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposal_support" ADD CONSTRAINT "proposal_support_contributor_id_contributors_id_fk" FOREIGN KEY ("contributor_id") REFERENCES "public"."contributors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_contributor_id_contributors_id_fk" FOREIGN KEY ("contributor_id") REFERENCES "public"."contributors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "runs" ADD CONSTRAINT "runs_contributor_id_contributors_id_fk" FOREIGN KEY ("contributor_id") REFERENCES "public"."contributors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verifications" ADD CONSTRAINT "verifications_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verifications" ADD CONSTRAINT "verifications_contributor_id_contributors_id_fk" FOREIGN KEY ("contributor_id") REFERENCES "public"."contributors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_reviews" ADD CONSTRAINT "work_reviews_work_id_works_id_fk" FOREIGN KEY ("work_id") REFERENCES "public"."works"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_reviews" ADD CONSTRAINT "work_reviews_contributor_id_contributors_id_fk" FOREIGN KEY ("contributor_id") REFERENCES "public"."contributors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "works" ADD CONSTRAINT "works_submitted_by_contributors_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."contributors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "contributors_key_hash" ON "contributors" USING btree ("key_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "contributors_seq" ON "contributors" USING btree ("seq");--> statement-breakpoint
CREATE UNIQUE INDEX "contributors_handle_lower" ON "contributors" USING btree (lower("handle"));--> statement-breakpoint
CREATE INDEX "events_at" ON "events" USING btree ("at");--> statement-breakpoint
CREATE UNIQUE INDEX "proposal_support_unique" ON "proposal_support" USING btree ("proposal_id","contributor_id");--> statement-breakpoint
CREATE INDEX "proposals_status" ON "proposals" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "runs_test_product_status" ON "runs" USING btree ("test_id","product_id","status");--> statement-breakpoint
CREATE INDEX "runs_status_created" ON "runs" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "runs_contributor" ON "runs" USING btree ("contributor_id");--> statement-breakpoint
CREATE INDEX "runs_ip_created" ON "runs" USING btree ("ip_hash","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "verifications_run_contributor" ON "verifications" USING btree ("run_id","contributor_id");--> statement-breakpoint
CREATE INDEX "verifications_contributor" ON "verifications" USING btree ("contributor_id");--> statement-breakpoint
CREATE INDEX "verifications_ip_created" ON "verifications" USING btree ("ip_hash","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "work_reviews_work_contributor" ON "work_reviews" USING btree ("work_id","contributor_id");--> statement-breakpoint
CREATE UNIQUE INDEX "works_url" ON "works" USING btree ("url");--> statement-breakpoint
CREATE INDEX "works_status" ON "works" USING btree ("status","created_at");