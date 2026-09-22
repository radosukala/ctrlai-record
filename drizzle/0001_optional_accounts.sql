CREATE TABLE "login_tokens" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"ip_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "people" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"session_version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_sign_in_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "contributors" ADD COLUMN "person_id" uuid;--> statement-breakpoint
ALTER TABLE "contributors" ADD COLUMN "merged_into" uuid;--> statement-breakpoint
CREATE INDEX "login_tokens_email_created" ON "login_tokens" USING btree ("email","created_at");--> statement-breakpoint
CREATE INDEX "login_tokens_ip_created" ON "login_tokens" USING btree ("ip_hash","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "people_email" ON "people" USING btree ("email");--> statement-breakpoint
ALTER TABLE "contributors" ADD CONSTRAINT "contributors_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "contributors_person" ON "contributors" USING btree ("person_id");