import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "cms"."enum_consents_scope" AS ENUM('CASE_STUDY', 'CLIENT_NAME', 'LOGO', 'PHOTOS', 'VIDEO', 'QUOTE');
  CREATE TYPE "cms"."enum__consents_v_version_scope" AS ENUM('CASE_STUDY', 'CLIENT_NAME', 'LOGO', 'PHOTOS', 'VIDEO', 'QUOTE');
  CREATE TYPE "cms"."enum__consents_v_version_status" AS ENUM('VALID', 'REVOKED');
  CREATE TYPE "cms"."enum__contacts_v_version_preferred_language" AS ENUM('ar', 'en');
  CREATE TYPE "cms"."enum_media_status" AS ENUM('DRAFT', 'APPROVED', 'WITHDRAWN');
  CREATE TYPE "cms"."enum__media_v_version_status" AS ENUM('DRAFT', 'APPROVED', 'WITHDRAWN');
  CREATE TYPE "cms"."enum__settings_v_version_stage" AS ENUM('PREVIEW', 'COMMERCIAL');
  ALTER TYPE "cms"."enum_pages_claim_status" ADD VALUE 'LEGALLY_BARRED' BEFORE 'PROHIBITED';
  ALTER TYPE "cms"."enum__pages_v_version_claim_status" ADD VALUE 'LEGALLY_BARRED' BEFORE 'PROHIBITED';
  ALTER TYPE "cms"."enum_case_studies_claim_status" ADD VALUE 'LEGALLY_BARRED' BEFORE 'PROHIBITED';
  ALTER TYPE "cms"."enum__case_studies_v_version_claim_status" ADD VALUE 'LEGALLY_BARRED' BEFORE 'PROHIBITED';
  CREATE TABLE "cms"."pages_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"claims_id" integer
  );
  
  CREATE TABLE "cms"."_pages_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"claims_id" integer
  );
  
  CREATE TABLE "cms"."case_studies_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"claims_id" integer
  );
  
  CREATE TABLE "cms"."_case_studies_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"claims_id" integer
  );
  
  CREATE TABLE "cms"."consents_scope" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "cms"."enum_consents_scope",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "cms"."_consents_v_version_scope" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "cms"."enum__consents_v_version_scope",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "cms"."_consents_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_subject" varchar NOT NULL,
  	"version_status" "cms"."enum__consents_v_version_status" DEFAULT 'VALID' NOT NULL,
  	"version_evidence_ref" varchar NOT NULL,
  	"version_granted_at" timestamp(3) with time zone,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "cms"."_organisations_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_legal_name" varchar NOT NULL,
  	"version_trade_name" varchar,
  	"version_tax_registration_no" varchar,
  	"version_commercial_registry_no" varchar,
  	"version_governorate" varchar,
  	"version_group_of_id" integer,
  	"version_merged_into_id" integer,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "cms"."_contacts_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_full_name" varchar NOT NULL,
  	"version_email" varchar,
  	"version_phone" varchar,
  	"version_role" varchar,
  	"version_organisation_id" integer,
  	"version_preferred_language" "cms"."enum__contacts_v_version_preferred_language",
  	"version_marketing_consent" boolean DEFAULT false,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "cms"."media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"status" "cms"."enum_media_status" DEFAULT 'DRAFT',
  	"depicts_client_property" boolean DEFAULT false,
  	"consent_id" integer,
  	"privacy_screened" boolean DEFAULT false,
  	"approved_by" varchar,
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
  
  CREATE TABLE "cms"."media_locales" (
  	"alt" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "cms"."_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "cms"."_media_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_status" "cms"."enum__media_v_version_status" DEFAULT 'DRAFT',
  	"version_depicts_client_property" boolean DEFAULT false,
  	"version_consent_id" integer,
  	"version_privacy_screened" boolean DEFAULT false,
  	"version_approved_by" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version_url" varchar,
  	"version_thumbnail_u_r_l" varchar,
  	"version_filename" varchar,
  	"version_mime_type" varchar,
  	"version_filesize" numeric,
  	"version_width" numeric,
  	"version_height" numeric,
  	"version_focal_x" numeric,
  	"version_focal_y" numeric,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "cms"."_media_v_locales" (
  	"version_alt" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "cms"."_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "cms"."_settings_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version_stage" "cms"."enum__settings_v_version_stage" DEFAULT 'PREVIEW' NOT NULL,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "cms"."pages" ADD COLUMN "last_edited_by" varchar;
  ALTER TABLE "cms"."_pages_v" ADD COLUMN "version_last_edited_by" varchar;
  ALTER TABLE "cms"."case_studies" ADD COLUMN "last_edited_by" varchar;
  ALTER TABLE "cms"."case_studies_locales" ADD COLUMN "seo_title" varchar;
  ALTER TABLE "cms"."case_studies_locales" ADD COLUMN "seo_description" varchar;
  ALTER TABLE "cms"."_case_studies_v" ADD COLUMN "version_last_edited_by" varchar;
  ALTER TABLE "cms"."_case_studies_v_locales" ADD COLUMN "version_seo_title" varchar;
  ALTER TABLE "cms"."_case_studies_v_locales" ADD COLUMN "version_seo_description" varchar;
  ALTER TABLE "cms"."consents" ADD COLUMN "evidence_ref" varchar NOT NULL;
  ALTER TABLE "cms"."consents" ADD COLUMN "granted_at" timestamp(3) with time zone;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD COLUMN "media_id" integer;
  ALTER TABLE "cms"."pages_rels" ADD CONSTRAINT "pages_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."pages_rels" ADD CONSTRAINT "pages_rels_claims_fk" FOREIGN KEY ("claims_id") REFERENCES "cms"."claims"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_pages_v_rels" ADD CONSTRAINT "_pages_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_pages_v_rels" ADD CONSTRAINT "_pages_v_rels_claims_fk" FOREIGN KEY ("claims_id") REFERENCES "cms"."claims"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."case_studies_rels" ADD CONSTRAINT "case_studies_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."case_studies"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."case_studies_rels" ADD CONSTRAINT "case_studies_rels_claims_fk" FOREIGN KEY ("claims_id") REFERENCES "cms"."claims"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_case_studies_v_rels" ADD CONSTRAINT "_case_studies_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."_case_studies_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_case_studies_v_rels" ADD CONSTRAINT "_case_studies_v_rels_claims_fk" FOREIGN KEY ("claims_id") REFERENCES "cms"."claims"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."consents_scope" ADD CONSTRAINT "consents_scope_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."consents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_consents_v_version_scope" ADD CONSTRAINT "_consents_v_version_scope_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."_consents_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_consents_v" ADD CONSTRAINT "_consents_v_parent_id_consents_id_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."consents"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_organisations_v" ADD CONSTRAINT "_organisations_v_parent_id_organisations_id_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."organisations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_organisations_v" ADD CONSTRAINT "_organisations_v_version_group_of_id_organisations_id_fk" FOREIGN KEY ("version_group_of_id") REFERENCES "cms"."organisations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_organisations_v" ADD CONSTRAINT "_organisations_v_version_merged_into_id_organisations_id_fk" FOREIGN KEY ("version_merged_into_id") REFERENCES "cms"."organisations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_contacts_v" ADD CONSTRAINT "_contacts_v_parent_id_contacts_id_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."contacts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_contacts_v" ADD CONSTRAINT "_contacts_v_version_organisation_id_organisations_id_fk" FOREIGN KEY ("version_organisation_id") REFERENCES "cms"."organisations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."media" ADD CONSTRAINT "media_consent_id_consents_id_fk" FOREIGN KEY ("consent_id") REFERENCES "cms"."consents"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."media_locales" ADD CONSTRAINT "media_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_media_v" ADD CONSTRAINT "_media_v_parent_id_media_id_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_media_v" ADD CONSTRAINT "_media_v_version_consent_id_consents_id_fk" FOREIGN KEY ("version_consent_id") REFERENCES "cms"."consents"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_media_v_locales" ADD CONSTRAINT "_media_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_media_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "pages_rels_order_idx" ON "cms"."pages_rels" USING btree ("order");
  CREATE INDEX "pages_rels_parent_idx" ON "cms"."pages_rels" USING btree ("parent_id");
  CREATE INDEX "pages_rels_path_idx" ON "cms"."pages_rels" USING btree ("path");
  CREATE INDEX "pages_rels_claims_id_idx" ON "cms"."pages_rels" USING btree ("claims_id");
  CREATE INDEX "_pages_v_rels_order_idx" ON "cms"."_pages_v_rels" USING btree ("order");
  CREATE INDEX "_pages_v_rels_parent_idx" ON "cms"."_pages_v_rels" USING btree ("parent_id");
  CREATE INDEX "_pages_v_rels_path_idx" ON "cms"."_pages_v_rels" USING btree ("path");
  CREATE INDEX "_pages_v_rels_claims_id_idx" ON "cms"."_pages_v_rels" USING btree ("claims_id");
  CREATE INDEX "case_studies_rels_order_idx" ON "cms"."case_studies_rels" USING btree ("order");
  CREATE INDEX "case_studies_rels_parent_idx" ON "cms"."case_studies_rels" USING btree ("parent_id");
  CREATE INDEX "case_studies_rels_path_idx" ON "cms"."case_studies_rels" USING btree ("path");
  CREATE INDEX "case_studies_rels_claims_id_idx" ON "cms"."case_studies_rels" USING btree ("claims_id");
  CREATE INDEX "_case_studies_v_rels_order_idx" ON "cms"."_case_studies_v_rels" USING btree ("order");
  CREATE INDEX "_case_studies_v_rels_parent_idx" ON "cms"."_case_studies_v_rels" USING btree ("parent_id");
  CREATE INDEX "_case_studies_v_rels_path_idx" ON "cms"."_case_studies_v_rels" USING btree ("path");
  CREATE INDEX "_case_studies_v_rels_claims_id_idx" ON "cms"."_case_studies_v_rels" USING btree ("claims_id");
  CREATE INDEX "consents_scope_order_idx" ON "cms"."consents_scope" USING btree ("order");
  CREATE INDEX "consents_scope_parent_idx" ON "cms"."consents_scope" USING btree ("parent_id");
  CREATE INDEX "_consents_v_version_scope_order_idx" ON "cms"."_consents_v_version_scope" USING btree ("order");
  CREATE INDEX "_consents_v_version_scope_parent_idx" ON "cms"."_consents_v_version_scope" USING btree ("parent_id");
  CREATE INDEX "_consents_v_parent_idx" ON "cms"."_consents_v" USING btree ("parent_id");
  CREATE INDEX "_consents_v_version_version_updated_at_idx" ON "cms"."_consents_v" USING btree ("version_updated_at");
  CREATE INDEX "_consents_v_version_version_created_at_idx" ON "cms"."_consents_v" USING btree ("version_created_at");
  CREATE INDEX "_consents_v_created_at_idx" ON "cms"."_consents_v" USING btree ("created_at");
  CREATE INDEX "_consents_v_updated_at_idx" ON "cms"."_consents_v" USING btree ("updated_at");
  CREATE INDEX "_organisations_v_parent_idx" ON "cms"."_organisations_v" USING btree ("parent_id");
  CREATE INDEX "_organisations_v_version_version_tax_registration_no_idx" ON "cms"."_organisations_v" USING btree ("version_tax_registration_no");
  CREATE INDEX "_organisations_v_version_version_commercial_registry_no_idx" ON "cms"."_organisations_v" USING btree ("version_commercial_registry_no");
  CREATE INDEX "_organisations_v_version_version_group_of_idx" ON "cms"."_organisations_v" USING btree ("version_group_of_id");
  CREATE INDEX "_organisations_v_version_version_merged_into_idx" ON "cms"."_organisations_v" USING btree ("version_merged_into_id");
  CREATE INDEX "_organisations_v_version_version_updated_at_idx" ON "cms"."_organisations_v" USING btree ("version_updated_at");
  CREATE INDEX "_organisations_v_version_version_created_at_idx" ON "cms"."_organisations_v" USING btree ("version_created_at");
  CREATE INDEX "_organisations_v_created_at_idx" ON "cms"."_organisations_v" USING btree ("created_at");
  CREATE INDEX "_organisations_v_updated_at_idx" ON "cms"."_organisations_v" USING btree ("updated_at");
  CREATE INDEX "_contacts_v_parent_idx" ON "cms"."_contacts_v" USING btree ("parent_id");
  CREATE INDEX "_contacts_v_version_version_organisation_idx" ON "cms"."_contacts_v" USING btree ("version_organisation_id");
  CREATE INDEX "_contacts_v_version_version_updated_at_idx" ON "cms"."_contacts_v" USING btree ("version_updated_at");
  CREATE INDEX "_contacts_v_version_version_created_at_idx" ON "cms"."_contacts_v" USING btree ("version_created_at");
  CREATE INDEX "_contacts_v_created_at_idx" ON "cms"."_contacts_v" USING btree ("created_at");
  CREATE INDEX "_contacts_v_updated_at_idx" ON "cms"."_contacts_v" USING btree ("updated_at");
  CREATE INDEX "media_consent_idx" ON "cms"."media" USING btree ("consent_id");
  CREATE INDEX "media_updated_at_idx" ON "cms"."media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "cms"."media" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_filename_idx" ON "cms"."media" USING btree ("filename");
  CREATE UNIQUE INDEX "media_locales_locale_parent_id_unique" ON "cms"."media_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_media_v_parent_idx" ON "cms"."_media_v" USING btree ("parent_id");
  CREATE INDEX "_media_v_version_version_consent_idx" ON "cms"."_media_v" USING btree ("version_consent_id");
  CREATE INDEX "_media_v_version_version_updated_at_idx" ON "cms"."_media_v" USING btree ("version_updated_at");
  CREATE INDEX "_media_v_version_version_created_at_idx" ON "cms"."_media_v" USING btree ("version_created_at");
  CREATE INDEX "_media_v_version_version_filename_idx" ON "cms"."_media_v" USING btree ("version_filename");
  CREATE INDEX "_media_v_created_at_idx" ON "cms"."_media_v" USING btree ("created_at");
  CREATE INDEX "_media_v_updated_at_idx" ON "cms"."_media_v" USING btree ("updated_at");
  CREATE UNIQUE INDEX "_media_v_locales_locale_parent_id_unique" ON "cms"."_media_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_settings_v_created_at_idx" ON "cms"."_settings_v" USING btree ("created_at");
  CREATE INDEX "_settings_v_updated_at_idx" ON "cms"."_settings_v" USING btree ("updated_at");
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "cms"."media"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "cms"."payload_locked_documents_rels" USING btree ("media_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "cms"."pages_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_pages_v_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."case_studies_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_case_studies_v_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."consents_scope" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_consents_v_version_scope" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_consents_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_organisations_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_contacts_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."media" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."media_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_media_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_media_v_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_settings_v" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "cms"."pages_rels" CASCADE;
  DROP TABLE "cms"."_pages_v_rels" CASCADE;
  DROP TABLE "cms"."case_studies_rels" CASCADE;
  DROP TABLE "cms"."_case_studies_v_rels" CASCADE;
  DROP TABLE "cms"."consents_scope" CASCADE;
  DROP TABLE "cms"."_consents_v_version_scope" CASCADE;
  DROP TABLE "cms"."_consents_v" CASCADE;
  DROP TABLE "cms"."_organisations_v" CASCADE;
  DROP TABLE "cms"."_contacts_v" CASCADE;
  DROP TABLE "cms"."media" CASCADE;
  DROP TABLE "cms"."media_locales" CASCADE;
  DROP TABLE "cms"."_media_v" CASCADE;
  DROP TABLE "cms"."_media_v_locales" CASCADE;
  DROP TABLE "cms"."_settings_v" CASCADE;
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_media_fk";
  
  ALTER TABLE "cms"."pages" ALTER COLUMN "claim_status" SET DATA TYPE text;
  ALTER TABLE "cms"."pages" ALTER COLUMN "claim_status" SET DEFAULT 'NONE'::text;
  DROP TYPE "cms"."enum_pages_claim_status";
  CREATE TYPE "cms"."enum_pages_claim_status" AS ENUM('NONE', 'OWNER_REPORTED', 'REVIEW_PENDING', 'INDEPENDENTLY_DEMONSTRATED', 'CERTIFIED', 'PROHIBITED');
  ALTER TABLE "cms"."pages" ALTER COLUMN "claim_status" SET DEFAULT 'NONE'::"cms"."enum_pages_claim_status";
  ALTER TABLE "cms"."pages" ALTER COLUMN "claim_status" SET DATA TYPE "cms"."enum_pages_claim_status" USING "claim_status"::"cms"."enum_pages_claim_status";
  ALTER TABLE "cms"."_pages_v" ALTER COLUMN "version_claim_status" SET DATA TYPE text;
  ALTER TABLE "cms"."_pages_v" ALTER COLUMN "version_claim_status" SET DEFAULT 'NONE'::text;
  DROP TYPE "cms"."enum__pages_v_version_claim_status";
  CREATE TYPE "cms"."enum__pages_v_version_claim_status" AS ENUM('NONE', 'OWNER_REPORTED', 'REVIEW_PENDING', 'INDEPENDENTLY_DEMONSTRATED', 'CERTIFIED', 'PROHIBITED');
  ALTER TABLE "cms"."_pages_v" ALTER COLUMN "version_claim_status" SET DEFAULT 'NONE'::"cms"."enum__pages_v_version_claim_status";
  ALTER TABLE "cms"."_pages_v" ALTER COLUMN "version_claim_status" SET DATA TYPE "cms"."enum__pages_v_version_claim_status" USING "version_claim_status"::"cms"."enum__pages_v_version_claim_status";
  ALTER TABLE "cms"."case_studies" ALTER COLUMN "claim_status" SET DATA TYPE text;
  ALTER TABLE "cms"."case_studies" ALTER COLUMN "claim_status" SET DEFAULT 'NONE'::text;
  DROP TYPE "cms"."enum_case_studies_claim_status";
  CREATE TYPE "cms"."enum_case_studies_claim_status" AS ENUM('NONE', 'OWNER_REPORTED', 'REVIEW_PENDING', 'INDEPENDENTLY_DEMONSTRATED', 'CERTIFIED', 'PROHIBITED');
  ALTER TABLE "cms"."case_studies" ALTER COLUMN "claim_status" SET DEFAULT 'NONE'::"cms"."enum_case_studies_claim_status";
  ALTER TABLE "cms"."case_studies" ALTER COLUMN "claim_status" SET DATA TYPE "cms"."enum_case_studies_claim_status" USING "claim_status"::"cms"."enum_case_studies_claim_status";
  ALTER TABLE "cms"."_case_studies_v" ALTER COLUMN "version_claim_status" SET DATA TYPE text;
  ALTER TABLE "cms"."_case_studies_v" ALTER COLUMN "version_claim_status" SET DEFAULT 'NONE'::text;
  DROP TYPE "cms"."enum__case_studies_v_version_claim_status";
  CREATE TYPE "cms"."enum__case_studies_v_version_claim_status" AS ENUM('NONE', 'OWNER_REPORTED', 'REVIEW_PENDING', 'INDEPENDENTLY_DEMONSTRATED', 'CERTIFIED', 'PROHIBITED');
  ALTER TABLE "cms"."_case_studies_v" ALTER COLUMN "version_claim_status" SET DEFAULT 'NONE'::"cms"."enum__case_studies_v_version_claim_status";
  ALTER TABLE "cms"."_case_studies_v" ALTER COLUMN "version_claim_status" SET DATA TYPE "cms"."enum__case_studies_v_version_claim_status" USING "version_claim_status"::"cms"."enum__case_studies_v_version_claim_status";
  DROP INDEX "cms"."payload_locked_documents_rels_media_id_idx";
  ALTER TABLE "cms"."pages" DROP COLUMN "last_edited_by";
  ALTER TABLE "cms"."_pages_v" DROP COLUMN "version_last_edited_by";
  ALTER TABLE "cms"."case_studies" DROP COLUMN "last_edited_by";
  ALTER TABLE "cms"."case_studies_locales" DROP COLUMN "seo_title";
  ALTER TABLE "cms"."case_studies_locales" DROP COLUMN "seo_description";
  ALTER TABLE "cms"."_case_studies_v" DROP COLUMN "version_last_edited_by";
  ALTER TABLE "cms"."_case_studies_v_locales" DROP COLUMN "version_seo_title";
  ALTER TABLE "cms"."_case_studies_v_locales" DROP COLUMN "version_seo_description";
  ALTER TABLE "cms"."consents" DROP COLUMN "evidence_ref";
  ALTER TABLE "cms"."consents" DROP COLUMN "granted_at";
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP COLUMN "media_id";
  DROP TYPE "cms"."enum_consents_scope";
  DROP TYPE "cms"."enum__consents_v_version_scope";
  DROP TYPE "cms"."enum__consents_v_version_status";
  DROP TYPE "cms"."enum__contacts_v_version_preferred_language";
  DROP TYPE "cms"."enum_media_status";
  DROP TYPE "cms"."enum__media_v_version_status";
  DROP TYPE "cms"."enum__settings_v_version_stage";`)
}
