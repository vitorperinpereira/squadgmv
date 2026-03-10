CREATE TYPE "public"."approval_status" AS ENUM('pending', 'approved', 'rejected', 'superseded');--> statement-breakpoint
CREATE TYPE "public"."execution_status" AS ENUM('not_started', 'queued', 'running', 'blocked', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."handoff_status" AS ENUM('pending', 'accepted', 'running', 'completed', 'rejected', 'escalated', 'expired', 'failed');--> statement-breakpoint
CREATE TYPE "public"."mission_status" AS ENUM('draft', 'accepted', 'projected', 'in_execution', 'blocked', 'completed', 'archived');--> statement-breakpoint
CREATE TYPE "public"."planning_kind" AS ENUM('project', 'epic', 'story', 'task');--> statement-breakpoint
CREATE TYPE "public"."planning_status" AS ENUM('backlog', 'refining', 'ready', 'in_progress', 'waiting_validation', 'done', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."process_type" AS ENUM('strategic', 'operational', 'optimization', 'governance');--> statement-breakpoint
CREATE TYPE "public"."validation_status" AS ENUM('passed', 'failed', 'warning');--> statement-breakpoint
CREATE TABLE "agent_profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"actor_type" text NOT NULL,
	"sector" text NOT NULL,
	"phase" text NOT NULL,
	"status" text NOT NULL,
	"roles" jsonb NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "agent_profiles_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "approval_decisions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"planning_item_id" uuid NOT NULL,
	"requested_by_agent_id" uuid NOT NULL,
	"approver_agent_id" uuid NOT NULL,
	"approval_type" text NOT NULL,
	"status" "approval_status" NOT NULL,
	"decision_notes" text NOT NULL,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"aggregate_type" text NOT NULL,
	"aggregate_id" text NOT NULL,
	"event_type" text NOT NULL,
	"actor_id" uuid,
	"correlation_id" text NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "handoffs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"task_id" uuid NOT NULL,
	"origin_agent_id" uuid NOT NULL,
	"target_agent_id" uuid NOT NULL,
	"task_type" text NOT NULL,
	"priority" text NOT NULL,
	"context" jsonb NOT NULL,
	"input" jsonb NOT NULL,
	"expected_output" jsonb NOT NULL,
	"deadline" text,
	"validation_rules" jsonb NOT NULL,
	"status" "handoff_status" NOT NULL,
	"result" jsonb NOT NULL,
	"confidence" numeric(3, 2),
	"notes" text NOT NULL,
	"needs_validation" boolean NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memory_records" (
	"id" uuid PRIMARY KEY NOT NULL,
	"domain" text NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"body_ref" text NOT NULL,
	"tags" jsonb NOT NULL,
	"source_type" text NOT NULL,
	"linked_planning_item_id" uuid,
	"linked_mission_id" uuid,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "missions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"objective" text NOT NULL,
	"context" jsonb NOT NULL,
	"priority" text NOT NULL,
	"status" "mission_status" NOT NULL,
	"process_type" "process_type" NOT NULL,
	"initiator_id" uuid NOT NULL,
	"owner_agent_id" uuid NOT NULL,
	"success_criteria" jsonb NOT NULL,
	"notion_project_page_id" text,
	"notion_project_url" text,
	"correlation_id" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "planning_items" (
	"id" uuid PRIMARY KEY NOT NULL,
	"mission_id" uuid NOT NULL,
	"parent_id" uuid,
	"notion_page_id" text,
	"kind" "planning_kind" NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"sector" text NOT NULL,
	"priority" text NOT NULL,
	"process_type" "process_type" NOT NULL,
	"planning_status" "planning_status" NOT NULL,
	"execution_status" "execution_status" NOT NULL,
	"owner_agent_id" uuid,
	"external_url" text,
	"context_summary" text NOT NULL,
	"acceptance_criteria" jsonb NOT NULL,
	"dependencies" jsonb NOT NULL,
	"input_summary" text NOT NULL,
	"expected_output" text NOT NULL,
	"validation_needed" boolean NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "validation_results" (
	"id" uuid PRIMARY KEY NOT NULL,
	"planning_item_id" uuid NOT NULL,
	"validator_agent_id" uuid NOT NULL,
	"validation_type" text NOT NULL,
	"status" "validation_status" NOT NULL,
	"findings" jsonb NOT NULL,
	"validated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflow_runs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"planning_item_id" uuid,
	"handoff_id" uuid,
	"job_name" text NOT NULL,
	"attempt" integer NOT NULL,
	"status" text NOT NULL,
	"correlation_id" text NOT NULL,
	"error_summary" text,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL
);
