CREATE TYPE "public"."message_kind" AS ENUM('answer', 'system_notice');--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "kind" "message_kind" DEFAULT 'answer' NOT NULL;