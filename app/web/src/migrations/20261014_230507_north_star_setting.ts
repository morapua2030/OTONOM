import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "cms"."enum_settings_north_star_kpi" AS ENUM('UNSELECTED', 'KPI-001_websiteSourced', 'KPI-002_websiteAssisted', 'KPI-003_totalWebsiteInfluenced', 'KPI-004_nonWebsite', 'KPI-005_unknown', 'KPI-006_totalEligible', 'KPI-015_attributionCoveragePct', 'KPI-016_overrideRatePct');
  CREATE TYPE "cms"."enum__settings_v_version_north_star_kpi" AS ENUM('UNSELECTED', 'KPI-001_websiteSourced', 'KPI-002_websiteAssisted', 'KPI-003_totalWebsiteInfluenced', 'KPI-004_nonWebsite', 'KPI-005_unknown', 'KPI-006_totalEligible', 'KPI-015_attributionCoveragePct', 'KPI-016_overrideRatePct');
  ALTER TABLE "cms"."settings" ADD COLUMN "north_star_kpi" "cms"."enum_settings_north_star_kpi" DEFAULT 'UNSELECTED';
  ALTER TABLE "cms"."_settings_v" ADD COLUMN "version_north_star_kpi" "cms"."enum__settings_v_version_north_star_kpi" DEFAULT 'UNSELECTED';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "cms"."settings" DROP COLUMN "north_star_kpi";
  ALTER TABLE "cms"."_settings_v" DROP COLUMN "version_north_star_kpi";
  DROP TYPE "cms"."enum_settings_north_star_kpi";
  DROP TYPE "cms"."enum__settings_v_version_north_star_kpi";`)
}
