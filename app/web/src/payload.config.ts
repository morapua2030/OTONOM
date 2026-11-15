import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildConfig } from 'payload';
import { postgresAdapter } from '@payloadcms/db-postgres';
import { resendAdapter } from '@payloadcms/email-resend';
import { vercelBlobStorage } from '@payloadcms/storage-vercel-blob';
import { collections } from './collections/index.ts';
import { Settings } from './globals/Settings.ts';
import { siteContentGlobals } from './collections/SiteContent.ts';
import { endpoints } from './endpoints/index.ts';
import { finalReleaseEndpoints } from './endpoints/final-release.ts';
import { cmsConnString, payloadSecret, SITE_URL, trustedCsrfOrigins } from './lib/server.ts';
import { protectedAdminOrigin, publicMarketingOnly } from './lib/deployment.ts';
import { blobStorageEnabled } from './lib/blob-origin.ts';
import { parseFromAddress, passwordResetEmailEnabled } from './lib/password-reset.ts';

const resetFrom = passwordResetEmailEnabled() ? parseFromAddress(process.env.OTONOM_EMAIL_FROM) : null;

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default buildConfig({
  secret: payloadSecret(),
  // Production marketing-only mode serves the admin on its own host (OTONOM_ADMIN_URL); everywhere else the site URL.
  serverURL: (publicMarketingOnly() && protectedAdminOrigin()) || SITE_URL,
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
        sales: { Component: '/components/admin/SalesView#SalesView', path: '/sales', exact: true },
      },
    },
    meta: { titleSuffix: ' — OTONOM' },
    // never call gravatar.com: it would send a hash of every staff e-mail to a third party (privacy)
    avatar: 'default',
  },
  collections,
  globals: [Settings, ...siteContentGlobals],
  endpoints: [...endpoints, ...finalReleaseEndpoints],
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
  // Password-reset e-mail only once Resend and a verified sender are configured (lib/password-reset.ts); otherwise
  // Payload has no e-mail transport and the reset request is refused with a clear code (Users beforeOperation).
  ...(resetFrom
    ? { email: resendAdapter({ apiKey: process.env.RESEND_API_KEY!.trim(), defaultFromAddress: resetFrom.address, defaultFromName: resetFrom.name }) }
    : {}),
  plugins: [
    // Public-site images survive deployments in Vercel Blob (owner 2026-11-15). The same columns exist everywhere
    // (alwaysInsertFields); development and tests keep using local disk. Private files never use Blob.
    vercelBlobStorage({
      enabled: blobStorageEnabled(),
      token: blobStorageEnabled() ? process.env.BLOB_READ_WRITE_TOKEN!.trim() : undefined,
      collections: { media: { disablePayloadAccessControl: true } },
      addRandomSuffix: true,
      alwaysInsertFields: true,
      cacheControlMaxAge: 30 * 24 * 60 * 60,
    }),
  ],
  telemetry: false,
  graphQL: { disablePlaygroundInProduction: true },
  upload: { limits: { fileSize: 25 * 1024 * 1024 } },
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
});
