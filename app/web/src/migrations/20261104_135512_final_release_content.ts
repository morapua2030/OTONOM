import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "cms"."enum_leads_package" AS ENUM('premium', 'plus', 'essential', 'unsure');
  CREATE TYPE "cms"."enum_leads_source" AS ENUM('contact', 'simulator');
  CREATE TYPE "cms"."enum_leads_locale" AS ENUM('ar', 'en');
  CREATE TYPE "cms"."enum_leads_status" AS ENUM('NEW', 'CONTACTED', 'VISIT_SCHEDULED', 'QUOTED', 'FOLLOW_UP', 'NOT_INTERESTED');
  CREATE TYPE "cms"."enum__leads_v_version_package" AS ENUM('premium', 'plus', 'essential', 'unsure');
  CREATE TYPE "cms"."enum__leads_v_version_source" AS ENUM('contact', 'simulator');
  CREATE TYPE "cms"."enum__leads_v_version_locale" AS ENUM('ar', 'en');
  CREATE TYPE "cms"."enum__leads_v_version_status" AS ENUM('NEW', 'CONTACTED', 'VISIT_SCHEDULED', 'QUOTED', 'FOLLOW_UP', 'NOT_INTERESTED');
  CREATE TYPE "cms"."enum_catalog_packages_items_key" AS ENUM('alexa', 'lock', 'ir', 'gas', 'controller', 'panel');
  CREATE TYPE "cms"."enum_catalog_packages_items_model" AS ENUM('4r', '6r', '16r');
  CREATE TYPE "cms"."enum_catalog_packages_package_id" AS ENUM('premium', 'plus', 'essential');
  CREATE TYPE "cms"."enum_catalog_packages_review_state" AS ENUM('DRAFT', 'IN_REVIEW', 'PUBLISHED');
  CREATE TYPE "cms"."enum_catalog_packages_status" AS ENUM('draft', 'published');
  CREATE TYPE "cms"."enum__catalog_packages_v_version_items_key" AS ENUM('alexa', 'lock', 'ir', 'gas', 'controller', 'panel');
  CREATE TYPE "cms"."enum__catalog_packages_v_version_items_model" AS ENUM('4r', '6r', '16r');
  CREATE TYPE "cms"."enum__catalog_packages_v_version_package_id" AS ENUM('premium', 'plus', 'essential');
  CREATE TYPE "cms"."enum__catalog_packages_v_version_review_state" AS ENUM('DRAFT', 'IN_REVIEW', 'PUBLISHED');
  CREATE TYPE "cms"."enum__catalog_packages_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "cms"."enum__catalog_packages_v_published_locale" AS ENUM('ar', 'en');
  CREATE TYPE "cms"."enum_catalog_controllers_model" AS ENUM('4r', '6r', '16r');
  CREATE TYPE "cms"."enum_catalog_controllers_review_state" AS ENUM('DRAFT', 'IN_REVIEW', 'PUBLISHED');
  CREATE TYPE "cms"."enum_catalog_controllers_status" AS ENUM('draft', 'published');
  CREATE TYPE "cms"."enum__catalog_controllers_v_version_model" AS ENUM('4r', '6r', '16r');
  CREATE TYPE "cms"."enum__catalog_controllers_v_version_review_state" AS ENUM('DRAFT', 'IN_REVIEW', 'PUBLISHED');
  CREATE TYPE "cms"."enum__catalog_controllers_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "cms"."enum__catalog_controllers_v_published_locale" AS ENUM('ar', 'en');
  CREATE TYPE "cms"."enum_sim_routines_routine_id" AS ENUM('morning', 'leave', 'arrive', 'night', 'guests', 'suhoor', 'travel', 'pump', 'gas');
  CREATE TYPE "cms"."enum_sim_routines_review_state" AS ENUM('DRAFT', 'IN_REVIEW', 'PUBLISHED');
  CREATE TYPE "cms"."enum_sim_routines_status" AS ENUM('draft', 'published');
  CREATE TYPE "cms"."enum__sim_routines_v_version_routine_id" AS ENUM('morning', 'leave', 'arrive', 'night', 'guests', 'suhoor', 'travel', 'pump', 'gas');
  CREATE TYPE "cms"."enum__sim_routines_v_version_review_state" AS ENUM('DRAFT', 'IN_REVIEW', 'PUBLISHED');
  CREATE TYPE "cms"."enum__sim_routines_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "cms"."enum__sim_routines_v_published_locale" AS ENUM('ar', 'en');
  CREATE TYPE "cms"."enum_service_faqs_service" AS ENUM('iot', 'soft', 'custom');
  CREATE TYPE "cms"."enum_service_faqs_review_state" AS ENUM('DRAFT', 'IN_REVIEW', 'PUBLISHED');
  CREATE TYPE "cms"."enum_service_faqs_status" AS ENUM('draft', 'published');
  CREATE TYPE "cms"."enum__service_faqs_v_version_service" AS ENUM('iot', 'soft', 'custom');
  CREATE TYPE "cms"."enum__service_faqs_v_version_review_state" AS ENUM('DRAFT', 'IN_REVIEW', 'PUBLISHED');
  CREATE TYPE "cms"."enum__service_faqs_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "cms"."enum__service_faqs_v_published_locale" AS ENUM('ar', 'en');
  CREATE TYPE "cms"."enum_contact_settings_socials_network" AS ENUM('facebook', 'instagram', 'linkedin', 'youtube', 'tiktok', 'x');
  CREATE TYPE "cms"."enum_contact_settings_review_state" AS ENUM('DRAFT', 'IN_REVIEW', 'PUBLISHED');
  CREATE TYPE "cms"."enum_contact_settings_status" AS ENUM('draft', 'published');
  CREATE TYPE "cms"."enum__contact_settings_v_version_socials_network" AS ENUM('facebook', 'instagram', 'linkedin', 'youtube', 'tiktok', 'x');
  CREATE TYPE "cms"."enum__contact_settings_v_version_review_state" AS ENUM('DRAFT', 'IN_REVIEW', 'PUBLISHED');
  CREATE TYPE "cms"."enum__contact_settings_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "cms"."enum__contact_settings_v_published_locale" AS ENUM('ar', 'en');
  CREATE TYPE "cms"."enum_announcement_review_state" AS ENUM('DRAFT', 'IN_REVIEW', 'PUBLISHED');
  CREATE TYPE "cms"."enum_announcement_status" AS ENUM('draft', 'published');
  CREATE TYPE "cms"."enum__announcement_v_version_review_state" AS ENUM('DRAFT', 'IN_REVIEW', 'PUBLISHED');
  CREATE TYPE "cms"."enum__announcement_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "cms"."enum__announcement_v_published_locale" AS ENUM('ar', 'en');
  CREATE TYPE "cms"."enum_sim_rules_review_state" AS ENUM('DRAFT', 'IN_REVIEW', 'PUBLISHED');
  CREATE TYPE "cms"."enum_sim_rules_status" AS ENUM('draft', 'published');
  CREATE TYPE "cms"."enum__sim_rules_v_version_review_state" AS ENUM('DRAFT', 'IN_REVIEW', 'PUBLISHED');
  CREATE TYPE "cms"."enum__sim_rules_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "cms"."enum__sim_rules_v_published_locale" AS ENUM('ar', 'en');
  ALTER TYPE "cms"."enum_users_role" ADD VALUE 'SALES' BEFORE 'CUSTOMER';
  CREATE TABLE "cms"."leads_notes" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar NOT NULL,
  	"by" varchar,
  	"at" timestamp(3) with time zone
  );
  
  CREATE TABLE "cms"."leads" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"ref" varchar NOT NULL,
  	"name" varchar NOT NULL,
  	"phone" varchar NOT NULL,
  	"area" varchar NOT NULL,
  	"package" "cms"."enum_leads_package" NOT NULL,
  	"preferred_time" varchar,
  	"message" varchar,
  	"plan" varchar,
  	"source" "cms"."enum_leads_source" NOT NULL,
  	"locale" "cms"."enum_leads_locale" NOT NULL,
  	"consent_given" boolean DEFAULT false NOT NULL,
  	"consent_at" timestamp(3) with time zone NOT NULL,
  	"consent_privacy_version" varchar NOT NULL,
  	"status" "cms"."enum_leads_status" DEFAULT 'NEW' NOT NULL,
  	"assignee_id" integer,
  	"last_activity_at" timestamp(3) with time zone,
  	"idempotency_key" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "cms"."_leads_v_version_notes" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"text" varchar NOT NULL,
  	"by" varchar,
  	"at" timestamp(3) with time zone,
  	"_uuid" varchar
  );
  
  CREATE TABLE "cms"."_leads_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_ref" varchar NOT NULL,
  	"version_name" varchar NOT NULL,
  	"version_phone" varchar NOT NULL,
  	"version_area" varchar NOT NULL,
  	"version_package" "cms"."enum__leads_v_version_package" NOT NULL,
  	"version_preferred_time" varchar,
  	"version_message" varchar,
  	"version_plan" varchar,
  	"version_source" "cms"."enum__leads_v_version_source" NOT NULL,
  	"version_locale" "cms"."enum__leads_v_version_locale" NOT NULL,
  	"version_consent_given" boolean DEFAULT false NOT NULL,
  	"version_consent_at" timestamp(3) with time zone NOT NULL,
  	"version_consent_privacy_version" varchar NOT NULL,
  	"version_status" "cms"."enum__leads_v_version_status" DEFAULT 'NEW' NOT NULL,
  	"version_assignee_id" integer,
  	"version_last_activity_at" timestamp(3) with time zone,
  	"version_idempotency_key" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "cms"."catalog_packages_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"key" "cms"."enum_catalog_packages_items_key",
  	"name_ar" varchar,
  	"name_en" varchar,
  	"quantity" numeric DEFAULT 1,
  	"model" "cms"."enum_catalog_packages_items_model",
  	"photo_id" integer
  );
  
  CREATE TABLE "cms"."catalog_packages" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"package_id" "cms"."enum_catalog_packages_package_id",
  	"name_ar" varchar,
  	"name_en" varchar,
  	"price_egp" numeric,
  	"most_complete" boolean DEFAULT false,
  	"badge_ar" varchar,
  	"badge_en" varchar,
  	"order" numeric DEFAULT 0,
  	"active" boolean DEFAULT true,
  	"review_state" "cms"."enum_catalog_packages_review_state" DEFAULT 'DRAFT',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "cms"."enum_catalog_packages_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "cms"."_catalog_packages_v_version_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" "cms"."enum__catalog_packages_v_version_items_key",
  	"name_ar" varchar,
  	"name_en" varchar,
  	"quantity" numeric DEFAULT 1,
  	"model" "cms"."enum__catalog_packages_v_version_items_model",
  	"photo_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE "cms"."_catalog_packages_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_package_id" "cms"."enum__catalog_packages_v_version_package_id",
  	"version_name_ar" varchar,
  	"version_name_en" varchar,
  	"version_price_egp" numeric,
  	"version_most_complete" boolean DEFAULT false,
  	"version_badge_ar" varchar,
  	"version_badge_en" varchar,
  	"version_order" numeric DEFAULT 0,
  	"version_active" boolean DEFAULT true,
  	"version_review_state" "cms"."enum__catalog_packages_v_version_review_state" DEFAULT 'DRAFT',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "cms"."enum__catalog_packages_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "cms"."enum__catalog_packages_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "cms"."catalog_controllers" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"model" "cms"."enum_catalog_controllers_model",
  	"name_ar" varchar,
  	"name_en" varchar,
  	"channels" numeric,
  	"channels_owner_override" boolean DEFAULT false,
  	"photo_id" integer,
  	"note_ar" varchar,
  	"note_en" varchar,
  	"in_packages" boolean DEFAULT false,
  	"review_state" "cms"."enum_catalog_controllers_review_state" DEFAULT 'DRAFT',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "cms"."enum_catalog_controllers_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "cms"."_catalog_controllers_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_model" "cms"."enum__catalog_controllers_v_version_model",
  	"version_name_ar" varchar,
  	"version_name_en" varchar,
  	"version_channels" numeric,
  	"version_channels_owner_override" boolean DEFAULT false,
  	"version_photo_id" integer,
  	"version_note_ar" varchar,
  	"version_note_en" varchar,
  	"version_in_packages" boolean DEFAULT false,
  	"version_review_state" "cms"."enum__catalog_controllers_v_version_review_state" DEFAULT 'DRAFT',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "cms"."enum__catalog_controllers_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "cms"."enum__catalog_controllers_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "cms"."sim_routines" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"routine_id" "cms"."enum_sim_routines_routine_id",
  	"title_ar" varchar,
  	"title_en" varchar,
  	"trigger_ar" varchar,
  	"trigger_en" varchar,
  	"actions_ar" varchar,
  	"actions_en" varchar,
  	"premium" boolean DEFAULT false,
  	"order" numeric DEFAULT 0,
  	"active" boolean DEFAULT true,
  	"review_state" "cms"."enum_sim_routines_review_state" DEFAULT 'DRAFT',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "cms"."enum_sim_routines_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "cms"."_sim_routines_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_routine_id" "cms"."enum__sim_routines_v_version_routine_id",
  	"version_title_ar" varchar,
  	"version_title_en" varchar,
  	"version_trigger_ar" varchar,
  	"version_trigger_en" varchar,
  	"version_actions_ar" varchar,
  	"version_actions_en" varchar,
  	"version_premium" boolean DEFAULT false,
  	"version_order" numeric DEFAULT 0,
  	"version_active" boolean DEFAULT true,
  	"version_review_state" "cms"."enum__sim_routines_v_version_review_state" DEFAULT 'DRAFT',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "cms"."enum__sim_routines_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "cms"."enum__sim_routines_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "cms"."service_faqs" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"service" "cms"."enum_service_faqs_service",
  	"question_ar" varchar,
  	"question_en" varchar,
  	"answer_ar" varchar,
  	"answer_en" varchar,
  	"order" numeric DEFAULT 0,
  	"active" boolean DEFAULT true,
  	"review_state" "cms"."enum_service_faqs_review_state" DEFAULT 'DRAFT',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "cms"."enum_service_faqs_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "cms"."_service_faqs_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_service" "cms"."enum__service_faqs_v_version_service",
  	"version_question_ar" varchar,
  	"version_question_en" varchar,
  	"version_answer_ar" varchar,
  	"version_answer_en" varchar,
  	"version_order" numeric DEFAULT 0,
  	"version_active" boolean DEFAULT true,
  	"version_review_state" "cms"."enum__service_faqs_v_version_review_state" DEFAULT 'DRAFT',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "cms"."enum__service_faqs_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "cms"."enum__service_faqs_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "cms"."contact_settings_socials" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"network" "cms"."enum_contact_settings_socials_network",
  	"url" varchar
  );
  
  CREATE TABLE "cms"."contact_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"phone_e164" varchar,
  	"whatsapp_e164" varchar,
  	"email" varchar,
  	"address_ar" varchar,
  	"address_en" varchar,
  	"hours_ar" varchar,
  	"hours_en" varchar,
  	"review_state" "cms"."enum_contact_settings_review_state" DEFAULT 'DRAFT',
  	"_status" "cms"."enum_contact_settings_status" DEFAULT 'draft',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "cms"."_contact_settings_v_version_socials" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"network" "cms"."enum__contact_settings_v_version_socials_network",
  	"url" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "cms"."_contact_settings_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version_phone_e164" varchar,
  	"version_whatsapp_e164" varchar,
  	"version_email" varchar,
  	"version_address_ar" varchar,
  	"version_address_en" varchar,
  	"version_hours_ar" varchar,
  	"version_hours_en" varchar,
  	"version_review_state" "cms"."enum__contact_settings_v_version_review_state" DEFAULT 'DRAFT',
  	"version__status" "cms"."enum__contact_settings_v_version_status" DEFAULT 'draft',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "cms"."enum__contact_settings_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "cms"."announcement" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"enabled" boolean DEFAULT false,
  	"text_ar" varchar,
  	"text_en" varchar,
  	"link" varchar,
  	"active_from" timestamp(3) with time zone,
  	"active_to" timestamp(3) with time zone,
  	"review_state" "cms"."enum_announcement_review_state" DEFAULT 'DRAFT',
  	"_status" "cms"."enum_announcement_status" DEFAULT 'draft',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "cms"."_announcement_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version_enabled" boolean DEFAULT false,
  	"version_text_ar" varchar,
  	"version_text_en" varchar,
  	"version_link" varchar,
  	"version_active_from" timestamp(3) with time zone,
  	"version_active_to" timestamp(3) with time zone,
  	"version_review_state" "cms"."enum__announcement_v_version_review_state" DEFAULT 'DRAFT',
  	"version__status" "cms"."enum__announcement_v_version_status" DEFAULT 'draft',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "cms"."enum__announcement_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "cms"."sim_rules" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"ac_channels" numeric DEFAULT 0,
  	"channels_per_device" numeric DEFAULT 1,
  	"engineer_review_above" numeric DEFAULT 64,
  	"review_state" "cms"."enum_sim_rules_review_state" DEFAULT 'DRAFT',
  	"_status" "cms"."enum_sim_rules_status" DEFAULT 'draft',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "cms"."_sim_rules_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version_ac_channels" numeric DEFAULT 0,
  	"version_channels_per_device" numeric DEFAULT 1,
  	"version_engineer_review_above" numeric DEFAULT 64,
  	"version_review_state" "cms"."enum__sim_rules_v_version_review_state" DEFAULT 'DRAFT',
  	"version__status" "cms"."enum__sim_rules_v_version_status" DEFAULT 'draft',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "cms"."enum__sim_rules_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "cms"."privacy_policy" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"body_ar" varchar NOT NULL,
  	"body_en" varchar NOT NULL,
  	"last_updated" timestamp(3) with time zone NOT NULL,
  	"approved" boolean DEFAULT false,
  	"approved_by" varchar,
  	"approved_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "cms"."_privacy_policy_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version_body_ar" varchar NOT NULL,
  	"version_body_en" varchar NOT NULL,
  	"version_last_updated" timestamp(3) with time zone NOT NULL,
  	"version_approved" boolean DEFAULT false,
  	"version_approved_by" varchar,
  	"version_approved_at" timestamp(3) with time zone,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "cms"."intake_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"enabled" boolean DEFAULT false,
  	"retention_months" numeric DEFAULT 12 NOT NULL,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "cms"."_intake_settings_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version_enabled" boolean DEFAULT false,
  	"version_retention_months" numeric DEFAULT 12 NOT NULL,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "cms"."users" ADD COLUMN "can_publish_content" boolean DEFAULT false;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD COLUMN "leads_id" integer;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD COLUMN "catalog_packages_id" integer;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD COLUMN "catalog_controllers_id" integer;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD COLUMN "sim_routines_id" integer;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD COLUMN "service_faqs_id" integer;
  ALTER TABLE "cms"."leads_notes" ADD CONSTRAINT "leads_notes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."leads"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."leads" ADD CONSTRAINT "leads_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "cms"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_leads_v_version_notes" ADD CONSTRAINT "_leads_v_version_notes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_leads_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_leads_v" ADD CONSTRAINT "_leads_v_parent_id_leads_id_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."leads"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_leads_v" ADD CONSTRAINT "_leads_v_version_assignee_id_users_id_fk" FOREIGN KEY ("version_assignee_id") REFERENCES "cms"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."catalog_packages_items" ADD CONSTRAINT "catalog_packages_items_photo_id_media_id_fk" FOREIGN KEY ("photo_id") REFERENCES "cms"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."catalog_packages_items" ADD CONSTRAINT "catalog_packages_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."catalog_packages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_catalog_packages_v_version_items" ADD CONSTRAINT "_catalog_packages_v_version_items_photo_id_media_id_fk" FOREIGN KEY ("photo_id") REFERENCES "cms"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_catalog_packages_v_version_items" ADD CONSTRAINT "_catalog_packages_v_version_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_catalog_packages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_catalog_packages_v" ADD CONSTRAINT "_catalog_packages_v_parent_id_catalog_packages_id_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."catalog_packages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."catalog_controllers" ADD CONSTRAINT "catalog_controllers_photo_id_media_id_fk" FOREIGN KEY ("photo_id") REFERENCES "cms"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_catalog_controllers_v" ADD CONSTRAINT "_catalog_controllers_v_parent_id_catalog_controllers_id_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."catalog_controllers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_catalog_controllers_v" ADD CONSTRAINT "_catalog_controllers_v_version_photo_id_media_id_fk" FOREIGN KEY ("version_photo_id") REFERENCES "cms"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_sim_routines_v" ADD CONSTRAINT "_sim_routines_v_parent_id_sim_routines_id_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."sim_routines"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_service_faqs_v" ADD CONSTRAINT "_service_faqs_v_parent_id_service_faqs_id_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."service_faqs"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."contact_settings_socials" ADD CONSTRAINT "contact_settings_socials_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."contact_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_contact_settings_v_version_socials" ADD CONSTRAINT "_contact_settings_v_version_socials_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_contact_settings_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "leads_notes_order_idx" ON "cms"."leads_notes" USING btree ("_order");
  CREATE INDEX "leads_notes_parent_id_idx" ON "cms"."leads_notes" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "leads_ref_idx" ON "cms"."leads" USING btree ("ref");
  CREATE INDEX "leads_phone_idx" ON "cms"."leads" USING btree ("phone");
  CREATE INDEX "leads_assignee_idx" ON "cms"."leads" USING btree ("assignee_id");
  CREATE INDEX "leads_last_activity_at_idx" ON "cms"."leads" USING btree ("last_activity_at");
  CREATE UNIQUE INDEX "leads_idempotency_key_idx" ON "cms"."leads" USING btree ("idempotency_key");
  CREATE INDEX "leads_updated_at_idx" ON "cms"."leads" USING btree ("updated_at");
  CREATE INDEX "leads_created_at_idx" ON "cms"."leads" USING btree ("created_at");
  CREATE INDEX "_leads_v_version_notes_order_idx" ON "cms"."_leads_v_version_notes" USING btree ("_order");
  CREATE INDEX "_leads_v_version_notes_parent_id_idx" ON "cms"."_leads_v_version_notes" USING btree ("_parent_id");
  CREATE INDEX "_leads_v_parent_idx" ON "cms"."_leads_v" USING btree ("parent_id");
  CREATE INDEX "_leads_v_version_version_ref_idx" ON "cms"."_leads_v" USING btree ("version_ref");
  CREATE INDEX "_leads_v_version_version_phone_idx" ON "cms"."_leads_v" USING btree ("version_phone");
  CREATE INDEX "_leads_v_version_version_assignee_idx" ON "cms"."_leads_v" USING btree ("version_assignee_id");
  CREATE INDEX "_leads_v_version_version_last_activity_at_idx" ON "cms"."_leads_v" USING btree ("version_last_activity_at");
  CREATE INDEX "_leads_v_version_version_idempotency_key_idx" ON "cms"."_leads_v" USING btree ("version_idempotency_key");
  CREATE INDEX "_leads_v_version_version_updated_at_idx" ON "cms"."_leads_v" USING btree ("version_updated_at");
  CREATE INDEX "_leads_v_version_version_created_at_idx" ON "cms"."_leads_v" USING btree ("version_created_at");
  CREATE INDEX "_leads_v_created_at_idx" ON "cms"."_leads_v" USING btree ("created_at");
  CREATE INDEX "_leads_v_updated_at_idx" ON "cms"."_leads_v" USING btree ("updated_at");
  CREATE INDEX "catalog_packages_items_order_idx" ON "cms"."catalog_packages_items" USING btree ("_order");
  CREATE INDEX "catalog_packages_items_parent_id_idx" ON "cms"."catalog_packages_items" USING btree ("_parent_id");
  CREATE INDEX "catalog_packages_items_photo_idx" ON "cms"."catalog_packages_items" USING btree ("photo_id");
  CREATE UNIQUE INDEX "catalog_packages_package_id_idx" ON "cms"."catalog_packages" USING btree ("package_id");
  CREATE INDEX "catalog_packages_updated_at_idx" ON "cms"."catalog_packages" USING btree ("updated_at");
  CREATE INDEX "catalog_packages_created_at_idx" ON "cms"."catalog_packages" USING btree ("created_at");
  CREATE INDEX "catalog_packages__status_idx" ON "cms"."catalog_packages" USING btree ("_status");
  CREATE INDEX "_catalog_packages_v_version_items_order_idx" ON "cms"."_catalog_packages_v_version_items" USING btree ("_order");
  CREATE INDEX "_catalog_packages_v_version_items_parent_id_idx" ON "cms"."_catalog_packages_v_version_items" USING btree ("_parent_id");
  CREATE INDEX "_catalog_packages_v_version_items_photo_idx" ON "cms"."_catalog_packages_v_version_items" USING btree ("photo_id");
  CREATE INDEX "_catalog_packages_v_parent_idx" ON "cms"."_catalog_packages_v" USING btree ("parent_id");
  CREATE INDEX "_catalog_packages_v_version_version_package_id_idx" ON "cms"."_catalog_packages_v" USING btree ("version_package_id");
  CREATE INDEX "_catalog_packages_v_version_version_updated_at_idx" ON "cms"."_catalog_packages_v" USING btree ("version_updated_at");
  CREATE INDEX "_catalog_packages_v_version_version_created_at_idx" ON "cms"."_catalog_packages_v" USING btree ("version_created_at");
  CREATE INDEX "_catalog_packages_v_version_version__status_idx" ON "cms"."_catalog_packages_v" USING btree ("version__status");
  CREATE INDEX "_catalog_packages_v_created_at_idx" ON "cms"."_catalog_packages_v" USING btree ("created_at");
  CREATE INDEX "_catalog_packages_v_updated_at_idx" ON "cms"."_catalog_packages_v" USING btree ("updated_at");
  CREATE INDEX "_catalog_packages_v_snapshot_idx" ON "cms"."_catalog_packages_v" USING btree ("snapshot");
  CREATE INDEX "_catalog_packages_v_published_locale_idx" ON "cms"."_catalog_packages_v" USING btree ("published_locale");
  CREATE INDEX "_catalog_packages_v_latest_idx" ON "cms"."_catalog_packages_v" USING btree ("latest");
  CREATE UNIQUE INDEX "catalog_controllers_model_idx" ON "cms"."catalog_controllers" USING btree ("model");
  CREATE INDEX "catalog_controllers_photo_idx" ON "cms"."catalog_controllers" USING btree ("photo_id");
  CREATE INDEX "catalog_controllers_updated_at_idx" ON "cms"."catalog_controllers" USING btree ("updated_at");
  CREATE INDEX "catalog_controllers_created_at_idx" ON "cms"."catalog_controllers" USING btree ("created_at");
  CREATE INDEX "catalog_controllers__status_idx" ON "cms"."catalog_controllers" USING btree ("_status");
  CREATE INDEX "_catalog_controllers_v_parent_idx" ON "cms"."_catalog_controllers_v" USING btree ("parent_id");
  CREATE INDEX "_catalog_controllers_v_version_version_model_idx" ON "cms"."_catalog_controllers_v" USING btree ("version_model");
  CREATE INDEX "_catalog_controllers_v_version_version_photo_idx" ON "cms"."_catalog_controllers_v" USING btree ("version_photo_id");
  CREATE INDEX "_catalog_controllers_v_version_version_updated_at_idx" ON "cms"."_catalog_controllers_v" USING btree ("version_updated_at");
  CREATE INDEX "_catalog_controllers_v_version_version_created_at_idx" ON "cms"."_catalog_controllers_v" USING btree ("version_created_at");
  CREATE INDEX "_catalog_controllers_v_version_version__status_idx" ON "cms"."_catalog_controllers_v" USING btree ("version__status");
  CREATE INDEX "_catalog_controllers_v_created_at_idx" ON "cms"."_catalog_controllers_v" USING btree ("created_at");
  CREATE INDEX "_catalog_controllers_v_updated_at_idx" ON "cms"."_catalog_controllers_v" USING btree ("updated_at");
  CREATE INDEX "_catalog_controllers_v_snapshot_idx" ON "cms"."_catalog_controllers_v" USING btree ("snapshot");
  CREATE INDEX "_catalog_controllers_v_published_locale_idx" ON "cms"."_catalog_controllers_v" USING btree ("published_locale");
  CREATE INDEX "_catalog_controllers_v_latest_idx" ON "cms"."_catalog_controllers_v" USING btree ("latest");
  CREATE UNIQUE INDEX "sim_routines_routine_id_idx" ON "cms"."sim_routines" USING btree ("routine_id");
  CREATE INDEX "sim_routines_updated_at_idx" ON "cms"."sim_routines" USING btree ("updated_at");
  CREATE INDEX "sim_routines_created_at_idx" ON "cms"."sim_routines" USING btree ("created_at");
  CREATE INDEX "sim_routines__status_idx" ON "cms"."sim_routines" USING btree ("_status");
  CREATE INDEX "_sim_routines_v_parent_idx" ON "cms"."_sim_routines_v" USING btree ("parent_id");
  CREATE INDEX "_sim_routines_v_version_version_routine_id_idx" ON "cms"."_sim_routines_v" USING btree ("version_routine_id");
  CREATE INDEX "_sim_routines_v_version_version_updated_at_idx" ON "cms"."_sim_routines_v" USING btree ("version_updated_at");
  CREATE INDEX "_sim_routines_v_version_version_created_at_idx" ON "cms"."_sim_routines_v" USING btree ("version_created_at");
  CREATE INDEX "_sim_routines_v_version_version__status_idx" ON "cms"."_sim_routines_v" USING btree ("version__status");
  CREATE INDEX "_sim_routines_v_created_at_idx" ON "cms"."_sim_routines_v" USING btree ("created_at");
  CREATE INDEX "_sim_routines_v_updated_at_idx" ON "cms"."_sim_routines_v" USING btree ("updated_at");
  CREATE INDEX "_sim_routines_v_snapshot_idx" ON "cms"."_sim_routines_v" USING btree ("snapshot");
  CREATE INDEX "_sim_routines_v_published_locale_idx" ON "cms"."_sim_routines_v" USING btree ("published_locale");
  CREATE INDEX "_sim_routines_v_latest_idx" ON "cms"."_sim_routines_v" USING btree ("latest");
  CREATE INDEX "service_faqs_updated_at_idx" ON "cms"."service_faqs" USING btree ("updated_at");
  CREATE INDEX "service_faqs_created_at_idx" ON "cms"."service_faqs" USING btree ("created_at");
  CREATE INDEX "service_faqs__status_idx" ON "cms"."service_faqs" USING btree ("_status");
  CREATE INDEX "_service_faqs_v_parent_idx" ON "cms"."_service_faqs_v" USING btree ("parent_id");
  CREATE INDEX "_service_faqs_v_version_version_updated_at_idx" ON "cms"."_service_faqs_v" USING btree ("version_updated_at");
  CREATE INDEX "_service_faqs_v_version_version_created_at_idx" ON "cms"."_service_faqs_v" USING btree ("version_created_at");
  CREATE INDEX "_service_faqs_v_version_version__status_idx" ON "cms"."_service_faqs_v" USING btree ("version__status");
  CREATE INDEX "_service_faqs_v_created_at_idx" ON "cms"."_service_faqs_v" USING btree ("created_at");
  CREATE INDEX "_service_faqs_v_updated_at_idx" ON "cms"."_service_faqs_v" USING btree ("updated_at");
  CREATE INDEX "_service_faqs_v_snapshot_idx" ON "cms"."_service_faqs_v" USING btree ("snapshot");
  CREATE INDEX "_service_faqs_v_published_locale_idx" ON "cms"."_service_faqs_v" USING btree ("published_locale");
  CREATE INDEX "_service_faqs_v_latest_idx" ON "cms"."_service_faqs_v" USING btree ("latest");
  CREATE INDEX "contact_settings_socials_order_idx" ON "cms"."contact_settings_socials" USING btree ("_order");
  CREATE INDEX "contact_settings_socials_parent_id_idx" ON "cms"."contact_settings_socials" USING btree ("_parent_id");
  CREATE INDEX "contact_settings__status_idx" ON "cms"."contact_settings" USING btree ("_status");
  CREATE INDEX "_contact_settings_v_version_socials_order_idx" ON "cms"."_contact_settings_v_version_socials" USING btree ("_order");
  CREATE INDEX "_contact_settings_v_version_socials_parent_id_idx" ON "cms"."_contact_settings_v_version_socials" USING btree ("_parent_id");
  CREATE INDEX "_contact_settings_v_version_version__status_idx" ON "cms"."_contact_settings_v" USING btree ("version__status");
  CREATE INDEX "_contact_settings_v_created_at_idx" ON "cms"."_contact_settings_v" USING btree ("created_at");
  CREATE INDEX "_contact_settings_v_updated_at_idx" ON "cms"."_contact_settings_v" USING btree ("updated_at");
  CREATE INDEX "_contact_settings_v_snapshot_idx" ON "cms"."_contact_settings_v" USING btree ("snapshot");
  CREATE INDEX "_contact_settings_v_published_locale_idx" ON "cms"."_contact_settings_v" USING btree ("published_locale");
  CREATE INDEX "_contact_settings_v_latest_idx" ON "cms"."_contact_settings_v" USING btree ("latest");
  CREATE INDEX "announcement__status_idx" ON "cms"."announcement" USING btree ("_status");
  CREATE INDEX "_announcement_v_version_version__status_idx" ON "cms"."_announcement_v" USING btree ("version__status");
  CREATE INDEX "_announcement_v_created_at_idx" ON "cms"."_announcement_v" USING btree ("created_at");
  CREATE INDEX "_announcement_v_updated_at_idx" ON "cms"."_announcement_v" USING btree ("updated_at");
  CREATE INDEX "_announcement_v_snapshot_idx" ON "cms"."_announcement_v" USING btree ("snapshot");
  CREATE INDEX "_announcement_v_published_locale_idx" ON "cms"."_announcement_v" USING btree ("published_locale");
  CREATE INDEX "_announcement_v_latest_idx" ON "cms"."_announcement_v" USING btree ("latest");
  CREATE INDEX "sim_rules__status_idx" ON "cms"."sim_rules" USING btree ("_status");
  CREATE INDEX "_sim_rules_v_version_version__status_idx" ON "cms"."_sim_rules_v" USING btree ("version__status");
  CREATE INDEX "_sim_rules_v_created_at_idx" ON "cms"."_sim_rules_v" USING btree ("created_at");
  CREATE INDEX "_sim_rules_v_updated_at_idx" ON "cms"."_sim_rules_v" USING btree ("updated_at");
  CREATE INDEX "_sim_rules_v_snapshot_idx" ON "cms"."_sim_rules_v" USING btree ("snapshot");
  CREATE INDEX "_sim_rules_v_published_locale_idx" ON "cms"."_sim_rules_v" USING btree ("published_locale");
  CREATE INDEX "_sim_rules_v_latest_idx" ON "cms"."_sim_rules_v" USING btree ("latest");
  CREATE INDEX "_privacy_policy_v_created_at_idx" ON "cms"."_privacy_policy_v" USING btree ("created_at");
  CREATE INDEX "_privacy_policy_v_updated_at_idx" ON "cms"."_privacy_policy_v" USING btree ("updated_at");
  CREATE INDEX "_intake_settings_v_created_at_idx" ON "cms"."_intake_settings_v" USING btree ("created_at");
  CREATE INDEX "_intake_settings_v_updated_at_idx" ON "cms"."_intake_settings_v" USING btree ("updated_at");
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_leads_fk" FOREIGN KEY ("leads_id") REFERENCES "cms"."leads"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_catalog_packages_fk" FOREIGN KEY ("catalog_packages_id") REFERENCES "cms"."catalog_packages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_catalog_controllers_fk" FOREIGN KEY ("catalog_controllers_id") REFERENCES "cms"."catalog_controllers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_sim_routines_fk" FOREIGN KEY ("sim_routines_id") REFERENCES "cms"."sim_routines"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_service_faqs_fk" FOREIGN KEY ("service_faqs_id") REFERENCES "cms"."service_faqs"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_leads_id_idx" ON "cms"."payload_locked_documents_rels" USING btree ("leads_id");
  CREATE INDEX "payload_locked_documents_rels_catalog_packages_id_idx" ON "cms"."payload_locked_documents_rels" USING btree ("catalog_packages_id");
  CREATE INDEX "payload_locked_documents_rels_catalog_controllers_id_idx" ON "cms"."payload_locked_documents_rels" USING btree ("catalog_controllers_id");
  CREATE INDEX "payload_locked_documents_rels_sim_routines_id_idx" ON "cms"."payload_locked_documents_rels" USING btree ("sim_routines_id");
  CREATE INDEX "payload_locked_documents_rels_service_faqs_id_idx" ON "cms"."payload_locked_documents_rels" USING btree ("service_faqs_id");`)
}

// Down: constraints and indexes on tables already dropped with CASCADE are dropped IF EXISTS (generator ordering).
// Rolling back fails while any user still has the SALES role: reassign those users first (docs/ai/RELEASE_CHECKLIST.md).
export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "cms"."leads_notes" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."leads" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_leads_v_version_notes" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_leads_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."catalog_packages_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."catalog_packages" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_catalog_packages_v_version_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_catalog_packages_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."catalog_controllers" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_catalog_controllers_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."sim_routines" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_sim_routines_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."service_faqs" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_service_faqs_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."contact_settings_socials" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."contact_settings" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_contact_settings_v_version_socials" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_contact_settings_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."announcement" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_announcement_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."sim_rules" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_sim_rules_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."privacy_policy" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_privacy_policy_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."intake_settings" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_intake_settings_v" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "cms"."leads_notes" CASCADE;
  DROP TABLE "cms"."leads" CASCADE;
  DROP TABLE "cms"."_leads_v_version_notes" CASCADE;
  DROP TABLE "cms"."_leads_v" CASCADE;
  DROP TABLE "cms"."catalog_packages_items" CASCADE;
  DROP TABLE "cms"."catalog_packages" CASCADE;
  DROP TABLE "cms"."_catalog_packages_v_version_items" CASCADE;
  DROP TABLE "cms"."_catalog_packages_v" CASCADE;
  DROP TABLE "cms"."catalog_controllers" CASCADE;
  DROP TABLE "cms"."_catalog_controllers_v" CASCADE;
  DROP TABLE "cms"."sim_routines" CASCADE;
  DROP TABLE "cms"."_sim_routines_v" CASCADE;
  DROP TABLE "cms"."service_faqs" CASCADE;
  DROP TABLE "cms"."_service_faqs_v" CASCADE;
  DROP TABLE "cms"."contact_settings_socials" CASCADE;
  DROP TABLE "cms"."contact_settings" CASCADE;
  DROP TABLE "cms"."_contact_settings_v_version_socials" CASCADE;
  DROP TABLE "cms"."_contact_settings_v" CASCADE;
  DROP TABLE "cms"."announcement" CASCADE;
  DROP TABLE "cms"."_announcement_v" CASCADE;
  DROP TABLE "cms"."sim_rules" CASCADE;
  DROP TABLE "cms"."_sim_rules_v" CASCADE;
  DROP TABLE "cms"."privacy_policy" CASCADE;
  DROP TABLE "cms"."_privacy_policy_v" CASCADE;
  DROP TABLE "cms"."intake_settings" CASCADE;
  DROP TABLE "cms"."_intake_settings_v" CASCADE;
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_leads_fk";
  
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_catalog_packages_fk";
  
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_catalog_controllers_fk";
  
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_sim_routines_fk";
  
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_service_faqs_fk";
  
  ALTER TABLE "cms"."users" ALTER COLUMN "role" SET DATA TYPE text;
  ALTER TABLE "cms"."users" ALTER COLUMN "role" SET DEFAULT 'CUSTOMER'::text;
  DROP TYPE "cms"."enum_users_role";
  CREATE TYPE "cms"."enum_users_role" AS ENUM('OWNER', 'ADMIN', 'ENGINEER', 'STORE', 'EDITOR', 'CUSTOMER');
  ALTER TABLE "cms"."users" ALTER COLUMN "role" SET DEFAULT 'CUSTOMER'::"cms"."enum_users_role";
  ALTER TABLE "cms"."users" ALTER COLUMN "role" SET DATA TYPE "cms"."enum_users_role" USING "role"::"cms"."enum_users_role";
  DROP INDEX IF EXISTS "cms"."payload_locked_documents_rels_leads_id_idx";
  DROP INDEX IF EXISTS "cms"."payload_locked_documents_rels_catalog_packages_id_idx";
  DROP INDEX IF EXISTS "cms"."payload_locked_documents_rels_catalog_controllers_id_idx";
  DROP INDEX IF EXISTS "cms"."payload_locked_documents_rels_sim_routines_id_idx";
  DROP INDEX IF EXISTS "cms"."payload_locked_documents_rels_service_faqs_id_idx";
  ALTER TABLE "cms"."users" DROP COLUMN "can_publish_content";
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP COLUMN "leads_id";
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP COLUMN "catalog_packages_id";
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP COLUMN "catalog_controllers_id";
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP COLUMN "sim_routines_id";
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP COLUMN "service_faqs_id";
  DROP TYPE "cms"."enum_leads_package";
  DROP TYPE "cms"."enum_leads_source";
  DROP TYPE "cms"."enum_leads_locale";
  DROP TYPE "cms"."enum_leads_status";
  DROP TYPE "cms"."enum__leads_v_version_package";
  DROP TYPE "cms"."enum__leads_v_version_source";
  DROP TYPE "cms"."enum__leads_v_version_locale";
  DROP TYPE "cms"."enum__leads_v_version_status";
  DROP TYPE "cms"."enum_catalog_packages_items_key";
  DROP TYPE "cms"."enum_catalog_packages_items_model";
  DROP TYPE "cms"."enum_catalog_packages_package_id";
  DROP TYPE "cms"."enum_catalog_packages_review_state";
  DROP TYPE "cms"."enum_catalog_packages_status";
  DROP TYPE "cms"."enum__catalog_packages_v_version_items_key";
  DROP TYPE "cms"."enum__catalog_packages_v_version_items_model";
  DROP TYPE "cms"."enum__catalog_packages_v_version_package_id";
  DROP TYPE "cms"."enum__catalog_packages_v_version_review_state";
  DROP TYPE "cms"."enum__catalog_packages_v_version_status";
  DROP TYPE "cms"."enum__catalog_packages_v_published_locale";
  DROP TYPE "cms"."enum_catalog_controllers_model";
  DROP TYPE "cms"."enum_catalog_controllers_review_state";
  DROP TYPE "cms"."enum_catalog_controllers_status";
  DROP TYPE "cms"."enum__catalog_controllers_v_version_model";
  DROP TYPE "cms"."enum__catalog_controllers_v_version_review_state";
  DROP TYPE "cms"."enum__catalog_controllers_v_version_status";
  DROP TYPE "cms"."enum__catalog_controllers_v_published_locale";
  DROP TYPE "cms"."enum_sim_routines_routine_id";
  DROP TYPE "cms"."enum_sim_routines_review_state";
  DROP TYPE "cms"."enum_sim_routines_status";
  DROP TYPE "cms"."enum__sim_routines_v_version_routine_id";
  DROP TYPE "cms"."enum__sim_routines_v_version_review_state";
  DROP TYPE "cms"."enum__sim_routines_v_version_status";
  DROP TYPE "cms"."enum__sim_routines_v_published_locale";
  DROP TYPE "cms"."enum_service_faqs_service";
  DROP TYPE "cms"."enum_service_faqs_review_state";
  DROP TYPE "cms"."enum_service_faqs_status";
  DROP TYPE "cms"."enum__service_faqs_v_version_service";
  DROP TYPE "cms"."enum__service_faqs_v_version_review_state";
  DROP TYPE "cms"."enum__service_faqs_v_version_status";
  DROP TYPE "cms"."enum__service_faqs_v_published_locale";
  DROP TYPE "cms"."enum_contact_settings_socials_network";
  DROP TYPE "cms"."enum_contact_settings_review_state";
  DROP TYPE "cms"."enum_contact_settings_status";
  DROP TYPE "cms"."enum__contact_settings_v_version_socials_network";
  DROP TYPE "cms"."enum__contact_settings_v_version_review_state";
  DROP TYPE "cms"."enum__contact_settings_v_version_status";
  DROP TYPE "cms"."enum__contact_settings_v_published_locale";
  DROP TYPE "cms"."enum_announcement_review_state";
  DROP TYPE "cms"."enum_announcement_status";
  DROP TYPE "cms"."enum__announcement_v_version_review_state";
  DROP TYPE "cms"."enum__announcement_v_version_status";
  DROP TYPE "cms"."enum__announcement_v_published_locale";
  DROP TYPE "cms"."enum_sim_rules_review_state";
  DROP TYPE "cms"."enum_sim_rules_status";
  DROP TYPE "cms"."enum__sim_rules_v_version_review_state";
  DROP TYPE "cms"."enum__sim_rules_v_version_status";
  DROP TYPE "cms"."enum__sim_rules_v_published_locale";`)
}
