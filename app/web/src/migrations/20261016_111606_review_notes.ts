import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "cms"."pages" ADD COLUMN "review_note" varchar;
  ALTER TABLE "cms"."pages" ADD COLUMN "review_note_by" varchar;
  ALTER TABLE "cms"."_pages_v" ADD COLUMN "version_review_note" varchar;
  ALTER TABLE "cms"."_pages_v" ADD COLUMN "version_review_note_by" varchar;
  ALTER TABLE "cms"."case_studies" ADD COLUMN "review_note" varchar;
  ALTER TABLE "cms"."case_studies" ADD COLUMN "review_note_by" varchar;
  ALTER TABLE "cms"."_case_studies_v" ADD COLUMN "version_review_note" varchar;
  ALTER TABLE "cms"."_case_studies_v" ADD COLUMN "version_review_note_by" varchar;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "cms"."pages" DROP COLUMN "review_note";
  ALTER TABLE "cms"."pages" DROP COLUMN "review_note_by";
  ALTER TABLE "cms"."_pages_v" DROP COLUMN "version_review_note";
  ALTER TABLE "cms"."_pages_v" DROP COLUMN "version_review_note_by";
  ALTER TABLE "cms"."case_studies" DROP COLUMN "review_note";
  ALTER TABLE "cms"."case_studies" DROP COLUMN "review_note_by";
  ALTER TABLE "cms"."_case_studies_v" DROP COLUMN "version_review_note";
  ALTER TABLE "cms"."_case_studies_v" DROP COLUMN "version_review_note_by";`)
}
