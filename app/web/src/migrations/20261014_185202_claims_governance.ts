import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "cms"."enum__claims_v_version_status" AS ENUM('OWNER_REPORTED', 'REVIEW_PENDING', 'INDEPENDENTLY_DEMONSTRATED', 'CERTIFIED', 'LEGALLY_BARRED', 'PROHIBITED');
  CREATE TYPE "cms"."enum__claims_v_version_impact" AS ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
  CREATE TABLE "cms"."_claims_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_code" varchar NOT NULL,
  	"version_status" "cms"."enum__claims_v_version_status" DEFAULT 'OWNER_REPORTED' NOT NULL,
  	"version_impact" "cms"."enum__claims_v_version_impact" DEFAULT 'MEDIUM',
  	"version_evidence_required" varchar,
  	"version_evidence_note" varchar,
  	"version_evidence_ref" varchar,
  	"version_certificate_ref" varchar,
  	"version_approved_by" varchar,
  	"version_approved_at" timestamp(3) with time zone,
  	"version_review_by" timestamp(3) with time zone,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "cms"."_claims_v_locales" (
  	"version_claim" varchar NOT NULL,
  	"version_safe_copy" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "cms"."_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  ALTER TABLE "cms"."claims" ADD COLUMN "evidence_ref" varchar;
  ALTER TABLE "cms"."claims" ADD COLUMN "certificate_ref" varchar;
  ALTER TABLE "cms"."claims" ADD COLUMN "approved_by" varchar;
  ALTER TABLE "cms"."claims" ADD COLUMN "approved_at" timestamp(3) with time zone;
  ALTER TABLE "cms"."_claims_v" ADD CONSTRAINT "_claims_v_parent_id_claims_id_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."claims"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_claims_v_locales" ADD CONSTRAINT "_claims_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_claims_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "_claims_v_parent_idx" ON "cms"."_claims_v" USING btree ("parent_id");
  CREATE INDEX "_claims_v_version_version_code_idx" ON "cms"."_claims_v" USING btree ("version_code");
  CREATE INDEX "_claims_v_version_version_updated_at_idx" ON "cms"."_claims_v" USING btree ("version_updated_at");
  CREATE INDEX "_claims_v_version_version_created_at_idx" ON "cms"."_claims_v" USING btree ("version_created_at");
  CREATE INDEX "_claims_v_created_at_idx" ON "cms"."_claims_v" USING btree ("created_at");
  CREATE INDEX "_claims_v_updated_at_idx" ON "cms"."_claims_v" USING btree ("updated_at");
  CREATE UNIQUE INDEX "_claims_v_locales_locale_parent_id_unique" ON "cms"."_claims_v_locales" USING btree ("_locale","_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "cms"."_claims_v" CASCADE;
  DROP TABLE "cms"."_claims_v_locales" CASCADE;
  ALTER TABLE "cms"."claims" DROP COLUMN "evidence_ref";
  ALTER TABLE "cms"."claims" DROP COLUMN "certificate_ref";
  ALTER TABLE "cms"."claims" DROP COLUMN "approved_by";
  ALTER TABLE "cms"."claims" DROP COLUMN "approved_at";
  DROP TYPE "cms"."enum__claims_v_version_status";
  DROP TYPE "cms"."enum__claims_v_version_impact";`)
}
