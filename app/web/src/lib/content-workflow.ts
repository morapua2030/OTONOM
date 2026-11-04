import { Forbidden, type CollectionAfterChangeHook, type CollectionBeforeChangeHook, type GlobalAfterChangeHook, type GlobalBeforeChangeHook, type PayloadRequest } from 'payload';
import { can } from '@otonom/domain';
import { mfaOk } from './access.ts';
import { auditRow } from './audit.ts';
import { BusinessRuleError } from './errors.ts';

/** Cache tag of every public read of admin-managed site content (lib/site-content.ts). */
export const SITE_CONTENT_TAG = 'site-content';

type U = { id: string | number; role?: string; canPublishContent?: boolean | null } | null | undefined;

/**
 * Publishing admin-managed site content: OWNER/ADMIN (`content.publish`), or an EDITOR ("CONTENT" role) the OWNER has
 * explicitly granted `canPublishContent`. SALES and everyone else can never publish.
 */
export function canPublishSiteContent(user: U): boolean {
  if (!user || !mfaOk(user as any)) return false;
  if (can(user.role, 'content.publish')) return true;
  return user.role === 'EDITOR' && user.canPublishContent === true;
}

export const REVIEW_STATES = ['DRAFT', 'IN_REVIEW', 'PUBLISHED'] as const;

export const REVIEW_FIELD = {
  name: 'reviewState',
  type: 'select',
  defaultValue: 'DRAFT',
  options: [...REVIEW_STATES],
  admin: { position: 'sidebar', description: 'Draft → In review (submitted by the editor) → Published (OWNER, or an editor the OWNER allowed to publish)' },
} as const;

/** Shared rule for collections and globals: drafts by `content.edit`, publishing only by `canPublishSiteContent`. */
function decide(data: any, req: PayloadRequest, previous: any) {
  const user = req.user as U;
  const publishing = data?._status === 'published';
  if (publishing) {
    if (!canPublishSiteContent(user)) throw new Forbidden(req.t);
    data.reviewState = 'PUBLISHED';
  } else {
    const to = data?.reviewState ?? previous?.reviewState ?? 'DRAFT';
    // a draft save never claims to be published; "submit for review" is the only transition an editor makes
    data.reviewState = to === 'PUBLISHED' ? 'DRAFT' : to;
  }
  return data;
}

export const siteContentBeforeChange: CollectionBeforeChangeHook = ({ data, req, originalDoc, context }) =>
  (context as any)?.systemSeed ? data : decide(data, req, originalDoc);
export const siteContentGlobalBeforeChange: GlobalBeforeChangeHook = ({ data, req, originalDoc, context }: any) =>
  context?.systemSeed ? data : decide(data, req, originalDoc);

async function afterPublish(req: PayloadRequest, entityType: string, id: string | number, before: any, doc: any) {
  const was = before?.reviewState ?? null;
  const now = doc?.reviewState ?? null;
  if (was !== now || doc?._status === 'published') {
    await auditRow(req, `site_content.${String(now ?? 'saved').toLowerCase()}`, entityType, id, { reviewState: was }, { reviewState: now, status: doc?._status ?? null });
  }
  if (doc?._status === 'published') revalidateSiteContent();
}

/** Expires the public content cache immediately (Next 16 `revalidateTag` with expire 0); a no-op outside Next. */
export function revalidateSiteContent() {
  import('next/cache')
    .then(({ revalidateTag }) => {
      try {
        revalidateTag(SITE_CONTENT_TAG, { expire: 0 });
      } catch {
        /* outside a Next request (seed script, tests): nothing is cached */
      }
    })
    .catch(() => undefined);
}

export const siteContentAfterChange =
  (entityType: string): CollectionAfterChangeHook =>
  async ({ doc, previousDoc, req, context }) => {
    if (!(context as any)?.systemSeed) await afterPublish(req, entityType, doc.id, previousDoc, doc);
    else revalidateSiteContent();
    return doc;
  };

export const siteContentGlobalAfterChange =
  (entityType: string): GlobalAfterChangeHook =>
  async ({ doc, previousDoc, req, context }: any) => {
    if (!context?.systemSeed) await afterPublish(req, entityType, entityType, previousDoc, doc);
    else revalidateSiteContent();
    return doc;
  };

/** Throws a 422 with a stable code (the admin shows it next to the field). */
export function invalid(code: string): never {
  throw new BusinessRuleError(`VALIDATION_FAILED:${code}`, 422);
}
