CREATE TYPE "public"."escalation_level" AS ENUM('to_c_level', 'to_ceo', 'to_founder');--> statement-breakpoint
CREATE TYPE "public"."escalation_status" AS ENUM('open', 'resolved');--> statement-breakpoint
CREATE TYPE "public"."governance_gate_stage" AS ENUM('validation', 'approval');--> statement-breakpoint
CREATE TYPE "public"."governance_scope" AS ENUM('project', 'task');--> statement-breakpoint
CREATE TABLE "escalation_records" (
	"id" uuid PRIMARY KEY NOT NULL,
	"handoff_id" uuid NOT NULL,
	"replacement_handoff_id" uuid NOT NULL,
	"from_agent_id" uuid NOT NULL,
	"to_agent_id" uuid NOT NULL,
	"level" "escalation_level" NOT NULL,
	"reason" text NOT NULL,
	"note" text NOT NULL,
	"status" "escalation_status" NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "governance_gate_policies" (
	"id" uuid PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"flow_key" text NOT NULL,
	"stage" "governance_gate_stage" NOT NULL,
	"scope" "governance_scope" NOT NULL,
	"task_slug" text,
	"sector" text NOT NULL,
	"active" boolean NOT NULL,
	"validator_slug" text,
	"validation_type" text,
	"initial_validation_status" "validation_status",
	"findings_template" jsonb NOT NULL,
	"requested_by_slug" text,
	"approver_slug" text,
	"approval_type" text,
	"decision_notes_template" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "governance_gate_policies_key_unique" UNIQUE("key")
);
