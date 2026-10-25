import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildConfig } from 'payload';
import { postgresAdapter } from '@payloadcms/db-postgres';
import { collections } from './collections/index.ts';
import { Settings } from './globals/Settings.ts';
import { endpoints } from './endpoints/index.ts';
import { cmsConnString, payloadSecret, SITE_URL, trustedCsrfOrigins } from './lib/server.ts';

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default buildConfig({
  secret: payloadSecret(),
  serverURL: SITE_URL,
  csrf: trustedCsrfOrigins(),
  admin: {
    user: 'users',
    importMap: { baseDir: path.resolve(dirname) },
    components: {
      beforeLogin: ['/components/StaffLoginNotice#StaffLoginNotice'],
      afterNavLinks: ['/components/admin/StaffNav#StaffNav'],
      // staff workspaces (each view re-checks MFA + permission; every action goes through the existing guarded endpoints)
      views: {
        overview: { Component: '/components/admin/OverviewView#OverviewView', path: '/overview', exact: true },
        contentReview: { Component: '/components/admin/ContentReviewView#ContentReviewView', path: '/content-review', exact: true },
        projectsWorkspace: { Component: '/components/admin/ProjectsView#ProjectsView', path: '/workspace', exact: true },
        kpiDashboard: { Component: '/components/admin/KpiView#KpiView', path: '/kpi', exact: true },
        storeOperations: { Component: '/components/admin/StoreView#StoreView', path: '/store-ops', exact: true },
        serviceDesk: { Component: '/components/admin/ServiceView#ServiceView', path: '/service-desk', exact: true },
        productDrafts: { Component: '/components/admin/ProductDraftsView#ProductDraftsView', path: '/product-drafts', exact: true },
        accountSecurity: { Component: '/components/admin/AccountSecurityView#AccountSecurityView', path: '/account-security', exact: true },
      },
    },
    meta: { titleSuffix: ' — OTONOM' },
    // never call gravatar.com: it would send a hash of every staff e-mail to a third party (privacy)
    avatar: 'default',
  },
  collections,
  globals: [Settings],
  endpoints,
  // expected business-rule refusals are not server faults (see lib/errors.ts BusinessRuleError)
  // custom error name (not in Payload's ErrorName union) — matched at runtime by err.name in logError
  loggingLevels: { BusinessRuleError: 'info' } as Record<string, 'info'>,
  localization: {
    locales: [
      { code: 'ar', label: 'العربية', rtl: true },
      { code: 'en', label: 'English' },
    ],
    defaultLocale: 'ar',
    fallback: false,
  },
  db: postgresAdapter({
    pool: { connectionString: cmsConnString(), max: Number(process.env.OTONOM_PG_POOL_MAX ?? (process.env.VERCEL === '1' ? 2 : 10)) },
    schemaName: 'cms',
    push: false,
    migrationDir: path.resolve(dirname, 'migrations'),
  }),
  telemetry: false,
  graphQL: { disablePlaygroundInProduction: true },
  upload: { limits: { fileSize: 25 * 1024 * 1024 } },
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
});
