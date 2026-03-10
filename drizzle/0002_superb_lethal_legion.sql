CREATE TYPE "public"."expansion_status" AS ENUM('planned', 'active', 'paused');--> statement-breakpoint
CREATE TYPE "public"."onboarding_status" AS ENUM('planned', 'ready', 'completed');--> statement-breakpoint
CREATE TYPE "public"."optimization_decision" AS ENUM('pending', 'adopt', 'revert', 'iterate');--> statement-breakpoint
CREATE TYPE "public"."optimization_status" AS ENUM('proposed', 'active', 'reviewing', 'adopted', 'reverted', 'iterating');--> statement-breakpoint
CREATE TABLE "agent_onboarding" (
	"id" uuid PRIMARY KEY NOT NULL,
	"agent_id" uuid NOT NULL,
	"agent_name" text NOT NULL,
	"agent_slug" text NOT NULL,
	"actor_type" text NOT NULL,
	"sector" text NOT NULL,
	"target_phase" text NOT NULL,
	"status" "onboarding_status" NOT NULL,
	"workflow_keys" jsonb NOT NULL,
	"required_memory_domains" jsonb NOT NULL,
	"checklist" jsonb NOT NULL,
	"linked_capability_id" uuid,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "optimization_initiatives" (
	"id" uuid PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"sector" text NOT NULL,
	"flow_key" text,
	"source_type" text NOT NULL,
	"source_ref" text NOT NULL,
	"hypothesis" text NOT NULL,
	"owner_agent_id" uuid NOT NULL,
	"linked_mission_id" uuid,
	"linked_planning_item_id" uuid,
	"linked_validation_id" uuid,
	"success_criteria" jsonb NOT NULL,
	"test_start" timestamp with time zone NOT NULL,
	"test_end" timestamp with time zone NOT NULL,
	"status" "optimization_status" NOT NULL,
	"decision" "optimization_decision" NOT NULL,
	"result_summary" text NOT NULL,
	"learnings" jsonb NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sector_capabilities" (
	"id" uuid PRIMARY KEY NOT NULL,
	"sector" text NOT NULL,
	"capability" text NOT NULL,
	"phase" text NOT NULL,
	"status" "expansion_status" NOT NULL,
	"workflow_keys" jsonb NOT NULL,
	"memory_domains" jsonb NOT NULL,
	"owner_agent_id" uuid,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
