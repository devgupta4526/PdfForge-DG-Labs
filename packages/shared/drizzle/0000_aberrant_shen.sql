DO $$ BEGIN
 CREATE TYPE "public"."blog_post_status" AS ENUM('draft', 'published', 'archived');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."operation_status" AS ENUM('started', 'processing', 'completed', 'failed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."payment_status" AS ENUM('success', 'failed', 'refunded');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."subscription_plan" AS ENUM('free', 'premium_monthly', 'premium_yearly', 'business');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."subscription_status" AS ENUM('active', 'cancelled', 'expired', 'past_due');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"key_hash" varchar(128) NOT NULL,
	"name" varchar(100) NOT NULL,
	"last_used_at" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	CONSTRAINT "api_keys_key_hash_unique" UNIQUE("key_hash")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "blog_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(255) NOT NULL,
	"title" varchar(255) NOT NULL,
	"excerpt" text,
	"content" text NOT NULL,
	"cover_image_url" text,
	"author_id" uuid,
	"status" "blog_post_status" DEFAULT 'draft' NOT NULL,
	"meta_title" varchar(255),
	"meta_description" varchar(320),
	"published_at" timestamp with time zone,
	"views_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "blog_posts_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "operations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"anonymous_id" varchar(64),
	"tool_slug" varchar(100) NOT NULL,
	"status" "operation_status" DEFAULT 'started' NOT NULL,
	"input_files_count" integer DEFAULT 0 NOT NULL,
	"input_size_bytes" bigint DEFAULT 0 NOT NULL,
	"output_size_bytes" bigint,
	"output_file_url" text,
	"output_file_expires_at" timestamp with time zone,
	"error_message" text,
	"processing_time_ms" integer,
	"ip_address" varchar(45),
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"subscription_id" uuid,
	"amount_inr" numeric(10, 2) NOT NULL,
	"currency" char(3) DEFAULT 'INR' NOT NULL,
	"status" "payment_status" NOT NULL,
	"razorpay_payment_id" varchar(255) NOT NULL,
	"razorpay_order_id" varchar(255),
	"invoice_number" varchar(64),
	"invoice_url" text,
	"payment_method" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_razorpay_payment_id_unique" UNIQUE("razorpay_payment_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"plan" "subscription_plan" DEFAULT 'free' NOT NULL,
	"status" "subscription_status" DEFAULT 'active' NOT NULL,
	"razorpay_subscription_id" varchar(255),
	"razorpay_customer_id" varchar(255),
	"current_period_start" timestamp with time zone,
	"current_period_end" timestamp with time zone,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "usage_tracking" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"anonymous_id" varchar(64),
	"date" date NOT NULL,
	"operations_count" integer DEFAULT 0 NOT NULL,
	"bytes_processed" bigint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_id" varchar(255) NOT NULL,
	"email" varchar(320) NOT NULL,
	"name" varchar(255),
	"avatar_url" text,
	"country" char(2),
	"phone" varchar(32),
	"email_verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_login_at" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "users_clerk_id_unique" UNIQUE("clerk_id"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "operations" ADD CONSTRAINT "operations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payments" ADD CONSTRAINT "payments_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE set null ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "usage_tracking" ADD CONSTRAINT "usage_tracking_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "api_keys_user_id_idx" ON "api_keys" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "api_keys_is_active_idx" ON "api_keys" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "api_keys_expires_at_idx" ON "api_keys" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "blog_posts_author_id_idx" ON "blog_posts" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "blog_posts_status_idx" ON "blog_posts" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "blog_posts_published_at_idx" ON "blog_posts" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "blog_posts_status_published_idx" ON "blog_posts" USING btree ("status","published_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "operations_user_id_idx" ON "operations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "operations_anonymous_id_idx" ON "operations" USING btree ("anonymous_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "operations_tool_slug_idx" ON "operations" USING btree ("tool_slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "operations_status_idx" ON "operations" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "operations_created_at_idx" ON "operations" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "operations_user_tool_created_idx" ON "operations" USING btree ("user_id","tool_slug","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "operations_expires_at_idx" ON "operations" USING btree ("output_file_expires_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payments_user_id_idx" ON "payments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payments_subscription_id_idx" ON "payments" USING btree ("subscription_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payments_status_idx" ON "payments" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payments_razorpay_order_id_idx" ON "payments" USING btree ("razorpay_order_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payments_created_at_idx" ON "payments" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "payments_invoice_number_unique" ON "payments" USING btree ("invoice_number");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "subscriptions_user_id_idx" ON "subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "subscriptions_status_idx" ON "subscriptions" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "subscriptions_plan_idx" ON "subscriptions" USING btree ("plan");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "subscriptions_current_period_end_idx" ON "subscriptions" USING btree ("current_period_end");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "subscriptions_razorpay_sub_id_unique" ON "subscriptions" USING btree ("razorpay_subscription_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "usage_tracking_user_date_unique" ON "usage_tracking" USING btree ("user_id","date");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "usage_tracking_anon_date_unique" ON "usage_tracking" USING btree ("anonymous_id","date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "usage_tracking_date_idx" ON "usage_tracking" USING btree ("date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "usage_tracking_user_id_idx" ON "usage_tracking" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_email_verified_idx" ON "users" USING btree ("email_verified");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_is_active_idx" ON "users" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_last_login_at_idx" ON "users" USING btree ("last_login_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_created_at_idx" ON "users" USING btree ("created_at");