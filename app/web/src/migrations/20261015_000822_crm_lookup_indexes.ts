import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE INDEX "contacts_email_idx" ON "cms"."contacts" USING btree ("email");
  CREATE INDEX "contacts_phone_idx" ON "cms"."contacts" USING btree ("phone");
  CREATE INDEX "_contacts_v_version_version_email_idx" ON "cms"."_contacts_v" USING btree ("version_email");
  CREATE INDEX "_contacts_v_version_version_phone_idx" ON "cms"."_contacts_v" USING btree ("version_phone");
  CREATE INDEX "rfqs_submitted_submitted_email_idx" ON "cms"."rfqs" USING btree ("submitted_email");
  CREATE INDEX "rfqs_submitted_submitted_phone_idx" ON "cms"."rfqs" USING btree ("submitted_phone");
  CREATE INDEX "_rfqs_v_version_submitted_version_submitted_email_idx" ON "cms"."_rfqs_v" USING btree ("version_submitted_email");
  CREATE INDEX "_rfqs_v_version_submitted_version_submitted_phone_idx" ON "cms"."_rfqs_v" USING btree ("version_submitted_phone");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "cms"."contacts_email_idx";
  DROP INDEX "cms"."contacts_phone_idx";
  DROP INDEX "cms"."_contacts_v_version_version_email_idx";
  DROP INDEX "cms"."_contacts_v_version_version_phone_idx";
  DROP INDEX "cms"."rfqs_submitted_submitted_email_idx";
  DROP INDEX "cms"."rfqs_submitted_submitted_phone_idx";
  DROP INDEX "cms"."_rfqs_v_version_submitted_version_submitted_email_idx";
  DROP INDEX "cms"."_rfqs_v_version_submitted_version_submitted_phone_idx";`)
}
