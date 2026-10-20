import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "cms"."_locales" AS ENUM('ar', 'en');
  CREATE TYPE "cms"."enum_users_role" AS ENUM('OWNER', 'ADMIN', 'ENGINEER', 'STORE', 'EDITOR', 'CUSTOMER');
  CREATE TYPE "cms"."enum_pages_workflow_status" AS ENUM('DRAFT', 'IN_REVIEW', 'APPROVED', 'PUBLISHED', 'WITHDRAWN');
  CREATE TYPE "cms"."enum_pages_claim_status" AS ENUM('NONE', 'OWNER_REPORTED', 'REVIEW_PENDING', 'INDEPENDENTLY_DEMONSTRATED', 'CERTIFIED', 'PROHIBITED');
  CREATE TYPE "cms"."enum_pages_status" AS ENUM('draft', 'published');
  CREATE TYPE "cms"."enum__pages_v_version_workflow_status" AS ENUM('DRAFT', 'IN_REVIEW', 'APPROVED', 'PUBLISHED', 'WITHDRAWN');
  CREATE TYPE "cms"."enum__pages_v_version_claim_status" AS ENUM('NONE', 'OWNER_REPORTED', 'REVIEW_PENDING', 'INDEPENDENTLY_DEMONSTRATED', 'CERTIFIED', 'PROHIBITED');
  CREATE TYPE "cms"."enum__pages_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "cms"."enum__pages_v_published_locale" AS ENUM('ar', 'en');
  CREATE TYPE "cms"."enum_case_studies_systems" AS ENUM('LIGHTING', 'CLIMATE', 'AV', 'AUDIO', 'DOORS_GARAGE', 'ALARM_INTEGRATION', 'SCENES');
  CREATE TYPE "cms"."enum_case_studies_project_type" AS ENUM('COMPOUND', 'MULTI_UNIT_BUILDING', 'VILLA', 'APARTMENT', 'COMMERCIAL');
  CREATE TYPE "cms"."enum_case_studies_workflow_status" AS ENUM('DRAFT', 'IN_REVIEW', 'APPROVED', 'PUBLISHED', 'WITHDRAWN');
  CREATE TYPE "cms"."enum_case_studies_claim_status" AS ENUM('NONE', 'OWNER_REPORTED', 'REVIEW_PENDING', 'INDEPENDENTLY_DEMONSTRATED', 'CERTIFIED', 'PROHIBITED');
  CREATE TYPE "cms"."enum_case_studies_status" AS ENUM('draft', 'published');
  CREATE TYPE "cms"."enum__case_studies_v_version_systems" AS ENUM('LIGHTING', 'CLIMATE', 'AV', 'AUDIO', 'DOORS_GARAGE', 'ALARM_INTEGRATION', 'SCENES');
  CREATE TYPE "cms"."enum__case_studies_v_version_project_type" AS ENUM('COMPOUND', 'MULTI_UNIT_BUILDING', 'VILLA', 'APARTMENT', 'COMMERCIAL');
  CREATE TYPE "cms"."enum__case_studies_v_version_workflow_status" AS ENUM('DRAFT', 'IN_REVIEW', 'APPROVED', 'PUBLISHED', 'WITHDRAWN');
  CREATE TYPE "cms"."enum__case_studies_v_version_claim_status" AS ENUM('NONE', 'OWNER_REPORTED', 'REVIEW_PENDING', 'INDEPENDENTLY_DEMONSTRATED', 'CERTIFIED', 'PROHIBITED');
  CREATE TYPE "cms"."enum__case_studies_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "cms"."enum__case_studies_v_published_locale" AS ENUM('ar', 'en');
  CREATE TYPE "cms"."enum_claims_status" AS ENUM('OWNER_REPORTED', 'REVIEW_PENDING', 'INDEPENDENTLY_DEMONSTRATED', 'CERTIFIED', 'LEGALLY_BARRED', 'PROHIBITED');
  CREATE TYPE "cms"."enum_claims_impact" AS ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
  CREATE TYPE "cms"."enum_consents_status" AS ENUM('VALID', 'REVOKED');
  CREATE TYPE "cms"."enum_contacts_preferred_language" AS ENUM('ar', 'en');
  CREATE TYPE "cms"."enum_rfqs_status" AS ENUM('SUBMITTED', 'INITIAL_QUALIFICATION', 'NEEDS_INFO', 'QUALIFIED', 'LOST', 'CANCELLED');
  CREATE TYPE "cms"."enum_rfqs_kind" AS ENUM('RFQ', 'CONSULTATION', 'PARTNER');
  CREATE TYPE "cms"."enum__rfqs_v_version_status" AS ENUM('SUBMITTED', 'INITIAL_QUALIFICATION', 'NEEDS_INFO', 'QUALIFIED', 'LOST', 'CANCELLED');
  CREATE TYPE "cms"."enum__rfqs_v_version_kind" AS ENUM('RFQ', 'CONSULTATION', 'PARTNER');
  CREATE TYPE "cms"."enum_opportunities_stage" AS ENUM('ENGINEERING_REVIEW', 'FREE_CONSULTATION', 'PAID_SITE_SURVEY', 'PROPOSAL_DRAFT', 'PROPOSAL_APPROVED', 'PROPOSAL_SENT', 'NEGOTIATION', 'WON_SIGNED', 'ON_HOLD', 'LOST', 'DELIVERY_HANDOFF');
  CREATE TYPE "cms"."enum_opportunities_engagement_model" AS ENUM('SUPPLY_ONLY', 'SUPPLY_INSTALL_PROGRAM', 'DESIGN_BUILD');
  CREATE TYPE "cms"."enum_opportunities_attribution_proposal" AS ENUM('WEBSITE_SOURCED', 'WEBSITE_ASSISTED', 'NON_WEBSITE', 'UNKNOWN');
  CREATE TYPE "cms"."enum__opportunities_v_version_stage" AS ENUM('ENGINEERING_REVIEW', 'FREE_CONSULTATION', 'PAID_SITE_SURVEY', 'PROPOSAL_DRAFT', 'PROPOSAL_APPROVED', 'PROPOSAL_SENT', 'NEGOTIATION', 'WON_SIGNED', 'ON_HOLD', 'LOST', 'DELIVERY_HANDOFF');
  CREATE TYPE "cms"."enum__opportunities_v_version_engagement_model" AS ENUM('SUPPLY_ONLY', 'SUPPLY_INSTALL_PROGRAM', 'DESIGN_BUILD');
  CREATE TYPE "cms"."enum__opportunities_v_version_attribution_proposal" AS ENUM('WEBSITE_SOURCED', 'WEBSITE_ASSISTED', 'NON_WEBSITE', 'UNKNOWN');
  CREATE TYPE "cms"."enum_private_files_scan_status" AS ENUM('PENDING', 'CLEAN', 'INFECTED', 'REJECTED');
  CREATE TYPE "cms"."enum_settings_stage" AS ENUM('PREVIEW', 'COMMERCIAL');
  CREATE TABLE "cms"."users_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "cms"."users" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"role" "cms"."enum_users_role" DEFAULT 'CUSTOMER' NOT NULL,
  	"totp_secret" varchar,
  	"mfa_enabled" boolean DEFAULT false,
  	"mfa_verified_sids" jsonb,
  	"last_totp_step" numeric DEFAULT 0,
  	"recovery_codes" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"reset_password_requested_at" timestamp(3) with time zone,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "cms"."pages" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar,
  	"requires_consent" boolean DEFAULT false,
  	"consent_id" integer,
  	"workflow_status" "cms"."enum_pages_workflow_status" DEFAULT 'DRAFT',
  	"reviewed_by" varchar,
  	"ai_assisted" boolean DEFAULT false,
  	"claim_status" "cms"."enum_pages_claim_status" DEFAULT 'NONE',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "cms"."enum_pages_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "cms"."pages_locales" (
  	"title" varchar,
  	"summary" varchar,
  	"body" varchar,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "cms"."_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "cms"."_pages_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_slug" varchar,
  	"version_requires_consent" boolean DEFAULT false,
  	"version_consent_id" integer,
  	"version_workflow_status" "cms"."enum__pages_v_version_workflow_status" DEFAULT 'DRAFT',
  	"version_reviewed_by" varchar,
  	"version_ai_assisted" boolean DEFAULT false,
  	"version_claim_status" "cms"."enum__pages_v_version_claim_status" DEFAULT 'NONE',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "cms"."enum__pages_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "cms"."enum__pages_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "cms"."_pages_v_locales" (
  	"version_title" varchar,
  	"version_summary" varchar,
  	"version_body" varchar,
  	"version_seo_title" varchar,
  	"version_seo_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "cms"."_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "cms"."case_studies_systems" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "cms"."enum_case_studies_systems",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "cms"."case_studies" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar,
  	"project_type" "cms"."enum_case_studies_project_type",
  	"media_screened" boolean DEFAULT false,
  	"requires_consent" boolean DEFAULT true,
  	"consent_id" integer,
  	"workflow_status" "cms"."enum_case_studies_workflow_status" DEFAULT 'DRAFT',
  	"reviewed_by" varchar,
  	"ai_assisted" boolean DEFAULT false,
  	"claim_status" "cms"."enum_case_studies_claim_status" DEFAULT 'NONE',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "cms"."enum_case_studies_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "cms"."case_studies_locales" (
  	"title" varchar,
  	"location_granularity" varchar,
  	"objectives" varchar,
  	"body" varchar,
  	"outcomes" varchar,
  	"limitations" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "cms"."_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "cms"."_case_studies_v_version_systems" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "cms"."enum__case_studies_v_version_systems",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "cms"."_case_studies_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_slug" varchar,
  	"version_project_type" "cms"."enum__case_studies_v_version_project_type",
  	"version_media_screened" boolean DEFAULT false,
  	"version_requires_consent" boolean DEFAULT true,
  	"version_consent_id" integer,
  	"version_workflow_status" "cms"."enum__case_studies_v_version_workflow_status" DEFAULT 'DRAFT',
  	"version_reviewed_by" varchar,
  	"version_ai_assisted" boolean DEFAULT false,
  	"version_claim_status" "cms"."enum__case_studies_v_version_claim_status" DEFAULT 'NONE',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "cms"."enum__case_studies_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "cms"."enum__case_studies_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "cms"."_case_studies_v_locales" (
  	"version_title" varchar,
  	"version_location_granularity" varchar,
  	"version_objectives" varchar,
  	"version_body" varchar,
  	"version_outcomes" varchar,
  	"version_limitations" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "cms"."_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "cms"."claims" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"code" varchar NOT NULL,
  	"status" "cms"."enum_claims_status" DEFAULT 'OWNER_REPORTED' NOT NULL,
  	"impact" "cms"."enum_claims_impact" DEFAULT 'MEDIUM',
  	"evidence_required" varchar,
  	"evidence_note" varchar,
  	"review_by" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "cms"."claims_locales" (
  	"claim" varchar NOT NULL,
  	"safe_copy" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "cms"."_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "cms"."consents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"subject" varchar NOT NULL,
  	"status" "cms"."enum_consents_status" DEFAULT 'VALID' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "cms"."organisations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"legal_name" varchar NOT NULL,
  	"trade_name" varchar,
  	"tax_registration_no" varchar,
  	"commercial_registry_no" varchar,
  	"governorate" varchar,
  	"group_of_id" integer,
  	"merged_into_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "cms"."contacts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"full_name" varchar NOT NULL,
  	"email" varchar,
  	"phone" varchar,
  	"role" varchar,
  	"organisation_id" integer,
  	"preferred_language" "cms"."enum_contacts_preferred_language",
  	"marketing_consent" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "cms"."rfqs" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"ref" varchar NOT NULL,
  	"status" "cms"."enum_rfqs_status" DEFAULT 'SUBMITTED' NOT NULL,
  	"status_reason" varchar,
  	"kind" "cms"."enum_rfqs_kind" DEFAULT 'RFQ',
  	"submitted_full_name" varchar,
  	"submitted_email" varchar,
  	"submitted_phone" varchar,
  	"submitted_organisation_name" varchar,
  	"submitted_contact_role" varchar,
  	"submitted_customer_type" varchar,
  	"submitted_project_type" varchar,
  	"submitted_governorate" varchar,
  	"submitted_city" varchar,
  	"submitted_units" numeric,
  	"submitted_circuits" numeric,
  	"submitted_systems" jsonb,
  	"submitted_engagement_model" varchar,
  	"submitted_description" varchar,
  	"submitted_phase" varchar,
  	"submitted_timeline" varchar,
  	"submitted_budget_band" varchar,
  	"submitted_preferred_channel" varchar,
  	"submitted_how_heard" varchar,
  	"submitted_locale" varchar,
  	"submitted_marketing_consent" boolean,
  	"submitted_attribution" jsonb,
  	"customer_type" varchar,
  	"project_type" varchar,
  	"governorate" varchar,
  	"idempotency_key" varchar,
  	"possible_duplicate_of_id" integer,
  	"organisation_id" integer,
  	"contact_id" integer,
  	"assigned_engineer_id" integer,
  	"qualification_score" numeric,
  	"opportunity_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "cms"."_rfqs_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_ref" varchar NOT NULL,
  	"version_status" "cms"."enum__rfqs_v_version_status" DEFAULT 'SUBMITTED' NOT NULL,
  	"version_status_reason" varchar,
  	"version_kind" "cms"."enum__rfqs_v_version_kind" DEFAULT 'RFQ',
  	"version_submitted_full_name" varchar,
  	"version_submitted_email" varchar,
  	"version_submitted_phone" varchar,
  	"version_submitted_organisation_name" varchar,
  	"version_submitted_contact_role" varchar,
  	"version_submitted_customer_type" varchar,
  	"version_submitted_project_type" varchar,
  	"version_submitted_governorate" varchar,
  	"version_submitted_city" varchar,
  	"version_submitted_units" numeric,
  	"version_submitted_circuits" numeric,
  	"version_submitted_systems" jsonb,
  	"version_submitted_engagement_model" varchar,
  	"version_submitted_description" varchar,
  	"version_submitted_phase" varchar,
  	"version_submitted_timeline" varchar,
  	"version_submitted_budget_band" varchar,
  	"version_submitted_preferred_channel" varchar,
  	"version_submitted_how_heard" varchar,
  	"version_submitted_locale" varchar,
  	"version_submitted_marketing_consent" boolean,
  	"version_submitted_attribution" jsonb,
  	"version_customer_type" varchar,
  	"version_project_type" varchar,
  	"version_governorate" varchar,
  	"version_idempotency_key" varchar,
  	"version_possible_duplicate_of_id" integer,
  	"version_organisation_id" integer,
  	"version_contact_id" integer,
  	"version_assigned_engineer_id" integer,
  	"version_qualification_score" numeric,
  	"version_opportunity_id" integer,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "cms"."opportunities" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"ref" varchar NOT NULL,
  	"stage" "cms"."enum_opportunities_stage" DEFAULT 'ENGINEERING_REVIEW' NOT NULL,
  	"rfq_id" integer,
  	"organisation_id" integer,
  	"primary_contact_id" integer,
  	"owner_engineer_id" integer,
  	"qualified_at" timestamp(3) with time zone,
  	"estimated_value_egp" numeric,
  	"engagement_model" "cms"."enum_opportunities_engagement_model",
  	"attribution_proposal" "cms"."enum_opportunities_attribution_proposal" DEFAULT 'UNKNOWN',
  	"attribution_evidence" varchar,
  	"survey_fee_agreed" boolean DEFAULT false,
  	"survey_invoice_ref" varchar,
  	"proposal_version" numeric DEFAULT 0,
  	"proposal_document_ref" varchar,
  	"proposal_valid_until" timestamp(3) with time zone,
  	"proposal_approved_by" varchar,
  	"capacity_check_note" varchar,
  	"lost_reason" varchar,
  	"on_hold_reason" varchar,
  	"follow_up_date" timestamp(3) with time zone,
  	"contract_ref" varchar,
  	"handoff_owner" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "cms"."_opportunities_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_ref" varchar NOT NULL,
  	"version_stage" "cms"."enum__opportunities_v_version_stage" DEFAULT 'ENGINEERING_REVIEW' NOT NULL,
  	"version_rfq_id" integer,
  	"version_organisation_id" integer,
  	"version_primary_contact_id" integer,
  	"version_owner_engineer_id" integer,
  	"version_qualified_at" timestamp(3) with time zone,
  	"version_estimated_value_egp" numeric,
  	"version_engagement_model" "cms"."enum__opportunities_v_version_engagement_model",
  	"version_attribution_proposal" "cms"."enum__opportunities_v_version_attribution_proposal" DEFAULT 'UNKNOWN',
  	"version_attribution_evidence" varchar,
  	"version_survey_fee_agreed" boolean DEFAULT false,
  	"version_survey_invoice_ref" varchar,
  	"version_proposal_version" numeric DEFAULT 0,
  	"version_proposal_document_ref" varchar,
  	"version_proposal_valid_until" timestamp(3) with time zone,
  	"version_proposal_approved_by" varchar,
  	"version_capacity_check_note" varchar,
  	"version_lost_reason" varchar,
  	"version_on_hold_reason" varchar,
  	"version_follow_up_date" timestamp(3) with time zone,
  	"version_contract_ref" varchar,
  	"version_handoff_owner" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "cms"."private_files" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"owner_id" integer,
  	"scan_status" "cms"."enum_private_files_scan_status" DEFAULT 'PENDING',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric
  );
  
  CREATE TABLE "cms"."payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "cms"."payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "cms"."payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer,
  	"pages_id" integer,
  	"case_studies_id" integer,
  	"claims_id" integer,
  	"consents_id" integer,
  	"organisations_id" integer,
  	"contacts_id" integer,
  	"rfqs_id" integer,
  	"opportunities_id" integer,
  	"private_files_id" integer
  );
  
  CREATE TABLE "cms"."payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "cms"."payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE "cms"."payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "cms"."settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"stage" "cms"."enum_settings_stage" DEFAULT 'PREVIEW' NOT NULL,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "cms"."users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."pages" ADD CONSTRAINT "pages_consent_id_consents_id_fk" FOREIGN KEY ("consent_id") REFERENCES "cms"."consents"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."pages_locales" ADD CONSTRAINT "pages_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_pages_v" ADD CONSTRAINT "_pages_v_parent_id_pages_id_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_pages_v" ADD CONSTRAINT "_pages_v_version_consent_id_consents_id_fk" FOREIGN KEY ("version_consent_id") REFERENCES "cms"."consents"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_pages_v_locales" ADD CONSTRAINT "_pages_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."case_studies_systems" ADD CONSTRAINT "case_studies_systems_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."case_studies"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."case_studies" ADD CONSTRAINT "case_studies_consent_id_consents_id_fk" FOREIGN KEY ("consent_id") REFERENCES "cms"."consents"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."case_studies_locales" ADD CONSTRAINT "case_studies_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."case_studies"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_case_studies_v_version_systems" ADD CONSTRAINT "_case_studies_v_version_systems_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."_case_studies_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_case_studies_v" ADD CONSTRAINT "_case_studies_v_parent_id_case_studies_id_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."case_studies"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_case_studies_v" ADD CONSTRAINT "_case_studies_v_version_consent_id_consents_id_fk" FOREIGN KEY ("version_consent_id") REFERENCES "cms"."consents"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_case_studies_v_locales" ADD CONSTRAINT "_case_studies_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_case_studies_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."claims_locales" ADD CONSTRAINT "claims_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."claims"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."organisations" ADD CONSTRAINT "organisations_group_of_id_organisations_id_fk" FOREIGN KEY ("group_of_id") REFERENCES "cms"."organisations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."organisations" ADD CONSTRAINT "organisations_merged_into_id_organisations_id_fk" FOREIGN KEY ("merged_into_id") REFERENCES "cms"."organisations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."contacts" ADD CONSTRAINT "contacts_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "cms"."organisations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."rfqs" ADD CONSTRAINT "rfqs_possible_duplicate_of_id_rfqs_id_fk" FOREIGN KEY ("possible_duplicate_of_id") REFERENCES "cms"."rfqs"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."rfqs" ADD CONSTRAINT "rfqs_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "cms"."organisations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."rfqs" ADD CONSTRAINT "rfqs_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "cms"."contacts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."rfqs" ADD CONSTRAINT "rfqs_assigned_engineer_id_users_id_fk" FOREIGN KEY ("assigned_engineer_id") REFERENCES "cms"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."rfqs" ADD CONSTRAINT "rfqs_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "cms"."opportunities"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_rfqs_v" ADD CONSTRAINT "_rfqs_v_parent_id_rfqs_id_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."rfqs"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_rfqs_v" ADD CONSTRAINT "_rfqs_v_version_possible_duplicate_of_id_rfqs_id_fk" FOREIGN KEY ("version_possible_duplicate_of_id") REFERENCES "cms"."rfqs"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_rfqs_v" ADD CONSTRAINT "_rfqs_v_version_organisation_id_organisations_id_fk" FOREIGN KEY ("version_organisation_id") REFERENCES "cms"."organisations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_rfqs_v" ADD CONSTRAINT "_rfqs_v_version_contact_id_contacts_id_fk" FOREIGN KEY ("version_contact_id") REFERENCES "cms"."contacts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_rfqs_v" ADD CONSTRAINT "_rfqs_v_version_assigned_engineer_id_users_id_fk" FOREIGN KEY ("version_assigned_engineer_id") REFERENCES "cms"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_rfqs_v" ADD CONSTRAINT "_rfqs_v_version_opportunity_id_opportunities_id_fk" FOREIGN KEY ("version_opportunity_id") REFERENCES "cms"."opportunities"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."opportunities" ADD CONSTRAINT "opportunities_rfq_id_rfqs_id_fk" FOREIGN KEY ("rfq_id") REFERENCES "cms"."rfqs"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."opportunities" ADD CONSTRAINT "opportunities_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "cms"."organisations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."opportunities" ADD CONSTRAINT "opportunities_primary_contact_id_contacts_id_fk" FOREIGN KEY ("primary_contact_id") REFERENCES "cms"."contacts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."opportunities" ADD CONSTRAINT "opportunities_owner_engineer_id_users_id_fk" FOREIGN KEY ("owner_engineer_id") REFERENCES "cms"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_opportunities_v" ADD CONSTRAINT "_opportunities_v_parent_id_opportunities_id_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."opportunities"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_opportunities_v" ADD CONSTRAINT "_opportunities_v_version_rfq_id_rfqs_id_fk" FOREIGN KEY ("version_rfq_id") REFERENCES "cms"."rfqs"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_opportunities_v" ADD CONSTRAINT "_opportunities_v_version_organisation_id_organisations_id_fk" FOREIGN KEY ("version_organisation_id") REFERENCES "cms"."organisations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_opportunities_v" ADD CONSTRAINT "_opportunities_v_version_primary_contact_id_contacts_id_fk" FOREIGN KEY ("version_primary_contact_id") REFERENCES "cms"."contacts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_opportunities_v" ADD CONSTRAINT "_opportunities_v_version_owner_engineer_id_users_id_fk" FOREIGN KEY ("version_owner_engineer_id") REFERENCES "cms"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."private_files" ADD CONSTRAINT "private_files_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "cms"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "cms"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_pages_fk" FOREIGN KEY ("pages_id") REFERENCES "cms"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_case_studies_fk" FOREIGN KEY ("case_studies_id") REFERENCES "cms"."case_studies"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_claims_fk" FOREIGN KEY ("claims_id") REFERENCES "cms"."claims"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_consents_fk" FOREIGN KEY ("consents_id") REFERENCES "cms"."consents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_organisations_fk" FOREIGN KEY ("organisations_id") REFERENCES "cms"."organisations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_contacts_fk" FOREIGN KEY ("contacts_id") REFERENCES "cms"."contacts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_rfqs_fk" FOREIGN KEY ("rfqs_id") REFERENCES "cms"."rfqs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_opportunities_fk" FOREIGN KEY ("opportunities_id") REFERENCES "cms"."opportunities"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_private_files_fk" FOREIGN KEY ("private_files_id") REFERENCES "cms"."private_files"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "cms"."users"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "users_sessions_order_idx" ON "cms"."users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "cms"."users_sessions" USING btree ("_parent_id");
  CREATE INDEX "users_updated_at_idx" ON "cms"."users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "cms"."users" USING btree ("created_at");
  CREATE UNIQUE INDEX "users_email_idx" ON "cms"."users" USING btree ("email");
  CREATE UNIQUE INDEX "pages_slug_idx" ON "cms"."pages" USING btree ("slug");
  CREATE INDEX "pages_consent_idx" ON "cms"."pages" USING btree ("consent_id");
  CREATE INDEX "pages_updated_at_idx" ON "cms"."pages" USING btree ("updated_at");
  CREATE INDEX "pages_created_at_idx" ON "cms"."pages" USING btree ("created_at");
  CREATE INDEX "pages__status_idx" ON "cms"."pages" USING btree ("_status");
  CREATE UNIQUE INDEX "pages_locales_locale_parent_id_unique" ON "cms"."pages_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_parent_idx" ON "cms"."_pages_v" USING btree ("parent_id");
  CREATE INDEX "_pages_v_version_version_slug_idx" ON "cms"."_pages_v" USING btree ("version_slug");
  CREATE INDEX "_pages_v_version_version_consent_idx" ON "cms"."_pages_v" USING btree ("version_consent_id");
  CREATE INDEX "_pages_v_version_version_updated_at_idx" ON "cms"."_pages_v" USING btree ("version_updated_at");
  CREATE INDEX "_pages_v_version_version_created_at_idx" ON "cms"."_pages_v" USING btree ("version_created_at");
  CREATE INDEX "_pages_v_version_version__status_idx" ON "cms"."_pages_v" USING btree ("version__status");
  CREATE INDEX "_pages_v_created_at_idx" ON "cms"."_pages_v" USING btree ("created_at");
  CREATE INDEX "_pages_v_updated_at_idx" ON "cms"."_pages_v" USING btree ("updated_at");
  CREATE INDEX "_pages_v_snapshot_idx" ON "cms"."_pages_v" USING btree ("snapshot");
  CREATE INDEX "_pages_v_published_locale_idx" ON "cms"."_pages_v" USING btree ("published_locale");
  CREATE INDEX "_pages_v_latest_idx" ON "cms"."_pages_v" USING btree ("latest");
  CREATE UNIQUE INDEX "_pages_v_locales_locale_parent_id_unique" ON "cms"."_pages_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "case_studies_systems_order_idx" ON "cms"."case_studies_systems" USING btree ("order");
  CREATE INDEX "case_studies_systems_parent_idx" ON "cms"."case_studies_systems" USING btree ("parent_id");
  CREATE UNIQUE INDEX "case_studies_slug_idx" ON "cms"."case_studies" USING btree ("slug");
  CREATE INDEX "case_studies_consent_idx" ON "cms"."case_studies" USING btree ("consent_id");
  CREATE INDEX "case_studies_updated_at_idx" ON "cms"."case_studies" USING btree ("updated_at");
  CREATE INDEX "case_studies_created_at_idx" ON "cms"."case_studies" USING btree ("created_at");
  CREATE INDEX "case_studies__status_idx" ON "cms"."case_studies" USING btree ("_status");
  CREATE UNIQUE INDEX "case_studies_locales_locale_parent_id_unique" ON "cms"."case_studies_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_case_studies_v_version_systems_order_idx" ON "cms"."_case_studies_v_version_systems" USING btree ("order");
  CREATE INDEX "_case_studies_v_version_systems_parent_idx" ON "cms"."_case_studies_v_version_systems" USING btree ("parent_id");
  CREATE INDEX "_case_studies_v_parent_idx" ON "cms"."_case_studies_v" USING btree ("parent_id");
  CREATE INDEX "_case_studies_v_version_version_slug_idx" ON "cms"."_case_studies_v" USING btree ("version_slug");
  CREATE INDEX "_case_studies_v_version_version_consent_idx" ON "cms"."_case_studies_v" USING btree ("version_consent_id");
  CREATE INDEX "_case_studies_v_version_version_updated_at_idx" ON "cms"."_case_studies_v" USING btree ("version_updated_at");
  CREATE INDEX "_case_studies_v_version_version_created_at_idx" ON "cms"."_case_studies_v" USING btree ("version_created_at");
  CREATE INDEX "_case_studies_v_version_version__status_idx" ON "cms"."_case_studies_v" USING btree ("version__status");
  CREATE INDEX "_case_studies_v_created_at_idx" ON "cms"."_case_studies_v" USING btree ("created_at");
  CREATE INDEX "_case_studies_v_updated_at_idx" ON "cms"."_case_studies_v" USING btree ("updated_at");
  CREATE INDEX "_case_studies_v_snapshot_idx" ON "cms"."_case_studies_v" USING btree ("snapshot");
  CREATE INDEX "_case_studies_v_published_locale_idx" ON "cms"."_case_studies_v" USING btree ("published_locale");
  CREATE INDEX "_case_studies_v_latest_idx" ON "cms"."_case_studies_v" USING btree ("latest");
  CREATE UNIQUE INDEX "_case_studies_v_locales_locale_parent_id_unique" ON "cms"."_case_studies_v_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "claims_code_idx" ON "cms"."claims" USING btree ("code");
  CREATE INDEX "claims_updated_at_idx" ON "cms"."claims" USING btree ("updated_at");
  CREATE INDEX "claims_created_at_idx" ON "cms"."claims" USING btree ("created_at");
  CREATE UNIQUE INDEX "claims_locales_locale_parent_id_unique" ON "cms"."claims_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "consents_updated_at_idx" ON "cms"."consents" USING btree ("updated_at");
  CREATE INDEX "consents_created_at_idx" ON "cms"."consents" USING btree ("created_at");
  CREATE UNIQUE INDEX "organisations_tax_registration_no_idx" ON "cms"."organisations" USING btree ("tax_registration_no");
  CREATE UNIQUE INDEX "organisations_commercial_registry_no_idx" ON "cms"."organisations" USING btree ("commercial_registry_no");
  CREATE INDEX "organisations_group_of_idx" ON "cms"."organisations" USING btree ("group_of_id");
  CREATE INDEX "organisations_merged_into_idx" ON "cms"."organisations" USING btree ("merged_into_id");
  CREATE INDEX "organisations_updated_at_idx" ON "cms"."organisations" USING btree ("updated_at");
  CREATE INDEX "organisations_created_at_idx" ON "cms"."organisations" USING btree ("created_at");
  CREATE INDEX "contacts_organisation_idx" ON "cms"."contacts" USING btree ("organisation_id");
  CREATE INDEX "contacts_updated_at_idx" ON "cms"."contacts" USING btree ("updated_at");
  CREATE INDEX "contacts_created_at_idx" ON "cms"."contacts" USING btree ("created_at");
  CREATE UNIQUE INDEX "rfqs_ref_idx" ON "cms"."rfqs" USING btree ("ref");
  CREATE UNIQUE INDEX "rfqs_idempotency_key_idx" ON "cms"."rfqs" USING btree ("idempotency_key");
  CREATE INDEX "rfqs_possible_duplicate_of_idx" ON "cms"."rfqs" USING btree ("possible_duplicate_of_id");
  CREATE INDEX "rfqs_organisation_idx" ON "cms"."rfqs" USING btree ("organisation_id");
  CREATE INDEX "rfqs_contact_idx" ON "cms"."rfqs" USING btree ("contact_id");
  CREATE INDEX "rfqs_assigned_engineer_idx" ON "cms"."rfqs" USING btree ("assigned_engineer_id");
  CREATE INDEX "rfqs_opportunity_idx" ON "cms"."rfqs" USING btree ("opportunity_id");
  CREATE INDEX "rfqs_updated_at_idx" ON "cms"."rfqs" USING btree ("updated_at");
  CREATE INDEX "rfqs_created_at_idx" ON "cms"."rfqs" USING btree ("created_at");
  CREATE INDEX "_rfqs_v_parent_idx" ON "cms"."_rfqs_v" USING btree ("parent_id");
  CREATE INDEX "_rfqs_v_version_version_ref_idx" ON "cms"."_rfqs_v" USING btree ("version_ref");
  CREATE INDEX "_rfqs_v_version_version_idempotency_key_idx" ON "cms"."_rfqs_v" USING btree ("version_idempotency_key");
  CREATE INDEX "_rfqs_v_version_version_possible_duplicate_of_idx" ON "cms"."_rfqs_v" USING btree ("version_possible_duplicate_of_id");
  CREATE INDEX "_rfqs_v_version_version_organisation_idx" ON "cms"."_rfqs_v" USING btree ("version_organisation_id");
  CREATE INDEX "_rfqs_v_version_version_contact_idx" ON "cms"."_rfqs_v" USING btree ("version_contact_id");
  CREATE INDEX "_rfqs_v_version_version_assigned_engineer_idx" ON "cms"."_rfqs_v" USING btree ("version_assigned_engineer_id");
  CREATE INDEX "_rfqs_v_version_version_opportunity_idx" ON "cms"."_rfqs_v" USING btree ("version_opportunity_id");
  CREATE INDEX "_rfqs_v_version_version_updated_at_idx" ON "cms"."_rfqs_v" USING btree ("version_updated_at");
  CREATE INDEX "_rfqs_v_version_version_created_at_idx" ON "cms"."_rfqs_v" USING btree ("version_created_at");
  CREATE INDEX "_rfqs_v_created_at_idx" ON "cms"."_rfqs_v" USING btree ("created_at");
  CREATE INDEX "_rfqs_v_updated_at_idx" ON "cms"."_rfqs_v" USING btree ("updated_at");
  CREATE UNIQUE INDEX "opportunities_ref_idx" ON "cms"."opportunities" USING btree ("ref");
  CREATE INDEX "opportunities_rfq_idx" ON "cms"."opportunities" USING btree ("rfq_id");
  CREATE INDEX "opportunities_organisation_idx" ON "cms"."opportunities" USING btree ("organisation_id");
  CREATE INDEX "opportunities_primary_contact_idx" ON "cms"."opportunities" USING btree ("primary_contact_id");
  CREATE INDEX "opportunities_owner_engineer_idx" ON "cms"."opportunities" USING btree ("owner_engineer_id");
  CREATE INDEX "opportunities_updated_at_idx" ON "cms"."opportunities" USING btree ("updated_at");
  CREATE INDEX "opportunities_created_at_idx" ON "cms"."opportunities" USING btree ("created_at");
  CREATE INDEX "_opportunities_v_parent_idx" ON "cms"."_opportunities_v" USING btree ("parent_id");
  CREATE INDEX "_opportunities_v_version_version_ref_idx" ON "cms"."_opportunities_v" USING btree ("version_ref");
  CREATE INDEX "_opportunities_v_version_version_rfq_idx" ON "cms"."_opportunities_v" USING btree ("version_rfq_id");
  CREATE INDEX "_opportunities_v_version_version_organisation_idx" ON "cms"."_opportunities_v" USING btree ("version_organisation_id");
  CREATE INDEX "_opportunities_v_version_version_primary_contact_idx" ON "cms"."_opportunities_v" USING btree ("version_primary_contact_id");
  CREATE INDEX "_opportunities_v_version_version_owner_engineer_idx" ON "cms"."_opportunities_v" USING btree ("version_owner_engineer_id");
  CREATE INDEX "_opportunities_v_version_version_updated_at_idx" ON "cms"."_opportunities_v" USING btree ("version_updated_at");
  CREATE INDEX "_opportunities_v_version_version_created_at_idx" ON "cms"."_opportunities_v" USING btree ("version_created_at");
  CREATE INDEX "_opportunities_v_created_at_idx" ON "cms"."_opportunities_v" USING btree ("created_at");
  CREATE INDEX "_opportunities_v_updated_at_idx" ON "cms"."_opportunities_v" USING btree ("updated_at");
  CREATE INDEX "private_files_owner_idx" ON "cms"."private_files" USING btree ("owner_id");
  CREATE INDEX "private_files_updated_at_idx" ON "cms"."private_files" USING btree ("updated_at");
  CREATE INDEX "private_files_created_at_idx" ON "cms"."private_files" USING btree ("created_at");
  CREATE UNIQUE INDEX "private_files_filename_idx" ON "cms"."private_files" USING btree ("filename");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "cms"."payload_kv" USING btree ("key");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "cms"."payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "cms"."payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "cms"."payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "cms"."payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "cms"."payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "cms"."payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "cms"."payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_locked_documents_rels_pages_id_idx" ON "cms"."payload_locked_documents_rels" USING btree ("pages_id");
  CREATE INDEX "payload_locked_documents_rels_case_studies_id_idx" ON "cms"."payload_locked_documents_rels" USING btree ("case_studies_id");
  CREATE INDEX "payload_locked_documents_rels_claims_id_idx" ON "cms"."payload_locked_documents_rels" USING btree ("claims_id");
  CREATE INDEX "payload_locked_documents_rels_consents_id_idx" ON "cms"."payload_locked_documents_rels" USING btree ("consents_id");
  CREATE INDEX "payload_locked_documents_rels_organisations_id_idx" ON "cms"."payload_locked_documents_rels" USING btree ("organisations_id");
  CREATE INDEX "payload_locked_documents_rels_contacts_id_idx" ON "cms"."payload_locked_documents_rels" USING btree ("contacts_id");
  CREATE INDEX "payload_locked_documents_rels_rfqs_id_idx" ON "cms"."payload_locked_documents_rels" USING btree ("rfqs_id");
  CREATE INDEX "payload_locked_documents_rels_opportunities_id_idx" ON "cms"."payload_locked_documents_rels" USING btree ("opportunities_id");
  CREATE INDEX "payload_locked_documents_rels_private_files_id_idx" ON "cms"."payload_locked_documents_rels" USING btree ("private_files_id");
  CREATE INDEX "payload_preferences_key_idx" ON "cms"."payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "cms"."payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "cms"."payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "cms"."payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "cms"."payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "cms"."payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "cms"."payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "cms"."payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "cms"."payload_migrations" USING btree ("created_at");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "cms"."users_sessions" CASCADE;
  DROP TABLE "cms"."users" CASCADE;
  DROP TABLE "cms"."pages" CASCADE;
  DROP TABLE "cms"."pages_locales" CASCADE;
  DROP TABLE "cms"."_pages_v" CASCADE;
  DROP TABLE "cms"."_pages_v_locales" CASCADE;
  DROP TABLE "cms"."case_studies_systems" CASCADE;
  DROP TABLE "cms"."case_studies" CASCADE;
  DROP TABLE "cms"."case_studies_locales" CASCADE;
  DROP TABLE "cms"."_case_studies_v_version_systems" CASCADE;
  DROP TABLE "cms"."_case_studies_v" CASCADE;
  DROP TABLE "cms"."_case_studies_v_locales" CASCADE;
  DROP TABLE "cms"."claims" CASCADE;
  DROP TABLE "cms"."claims_locales" CASCADE;
  DROP TABLE "cms"."consents" CASCADE;
  DROP TABLE "cms"."organisations" CASCADE;
  DROP TABLE "cms"."contacts" CASCADE;
  DROP TABLE "cms"."rfqs" CASCADE;
  DROP TABLE "cms"."_rfqs_v" CASCADE;
  DROP TABLE "cms"."opportunities" CASCADE;
  DROP TABLE "cms"."_opportunities_v" CASCADE;
  DROP TABLE "cms"."private_files" CASCADE;
  DROP TABLE "cms"."payload_kv" CASCADE;
  DROP TABLE "cms"."payload_locked_documents" CASCADE;
  DROP TABLE "cms"."payload_locked_documents_rels" CASCADE;
  DROP TABLE "cms"."payload_preferences" CASCADE;
  DROP TABLE "cms"."payload_preferences_rels" CASCADE;
  DROP TABLE "cms"."payload_migrations" CASCADE;
  DROP TABLE "cms"."settings" CASCADE;
  DROP TYPE "cms"."_locales";
  DROP TYPE "cms"."enum_users_role";
  DROP TYPE "cms"."enum_pages_workflow_status";
  DROP TYPE "cms"."enum_pages_claim_status";
  DROP TYPE "cms"."enum_pages_status";
  DROP TYPE "cms"."enum__pages_v_version_workflow_status";
  DROP TYPE "cms"."enum__pages_v_version_claim_status";
  DROP TYPE "cms"."enum__pages_v_version_status";
  DROP TYPE "cms"."enum__pages_v_published_locale";
  DROP TYPE "cms"."enum_case_studies_systems";
  DROP TYPE "cms"."enum_case_studies_project_type";
  DROP TYPE "cms"."enum_case_studies_workflow_status";
  DROP TYPE "cms"."enum_case_studies_claim_status";
  DROP TYPE "cms"."enum_case_studies_status";
  DROP TYPE "cms"."enum__case_studies_v_version_systems";
  DROP TYPE "cms"."enum__case_studies_v_version_project_type";
  DROP TYPE "cms"."enum__case_studies_v_version_workflow_status";
  DROP TYPE "cms"."enum__case_studies_v_version_claim_status";
  DROP TYPE "cms"."enum__case_studies_v_version_status";
  DROP TYPE "cms"."enum__case_studies_v_published_locale";
  DROP TYPE "cms"."enum_claims_status";
  DROP TYPE "cms"."enum_claims_impact";
  DROP TYPE "cms"."enum_consents_status";
  DROP TYPE "cms"."enum_contacts_preferred_language";
  DROP TYPE "cms"."enum_rfqs_status";
  DROP TYPE "cms"."enum_rfqs_kind";
  DROP TYPE "cms"."enum__rfqs_v_version_status";
  DROP TYPE "cms"."enum__rfqs_v_version_kind";
  DROP TYPE "cms"."enum_opportunities_stage";
  DROP TYPE "cms"."enum_opportunities_engagement_model";
  DROP TYPE "cms"."enum_opportunities_attribution_proposal";
  DROP TYPE "cms"."enum__opportunities_v_version_stage";
  DROP TYPE "cms"."enum__opportunities_v_version_engagement_model";
  DROP TYPE "cms"."enum__opportunities_v_version_attribution_proposal";
  DROP TYPE "cms"."enum_private_files_scan_status";
  DROP TYPE "cms"."enum_settings_stage";`)
}
