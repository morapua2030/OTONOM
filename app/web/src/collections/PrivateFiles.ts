import { BusinessRuleError } from '../lib/errors.ts';
import { exposeDomainErrorCodes } from '../lib/errors.ts';
import { type CollectionConfig, type FieldAccess } from 'payload';
import { can, classifyUpload } from '@otonom/domain';
import { mfaOk, nobody, perm } from '../lib/access.ts';
import { PRIVATE_UPLOAD_DIR, uploadsDisabled } from '../lib/server.ts';

const scanFieldAccess: FieldAccess = ({ req }) => !!req.user && mfaOk(req.user as any) && can((req.user as any).role, 'file.scan_result');

export const PrivateFiles: CollectionConfig = {
  slug: 'private-files',
  upload: {
    staticDir: PRIVATE_UPLOAD_DIR,
    mimeTypes: ['application/pdf', 'image/png', 'image/jpeg', 'image/vnd.dxf', 'application/dxf', 'application/octet-stream', 'text/plain'],
    // fail closed: native file route never serves anything that is not CLEAN, regardless of role
    handlers: [
      (_req, { doc }) => {
        if ((doc as any)?.scanStatus !== 'CLEAN') return Response.json({ code: 'FILE_NOT_AVAILABLE' }, { status: 423 });
        return undefined;
      },
    ],
    modifyResponseHeaders: ({ headers }) => {
      headers.set('cache-control', 'private, no-store');
      headers.set('x-content-type-options', 'nosniff');
      return headers;
    },
  },
  admin: { group: 'Projects' },
  access: {
    create: ({ req }) => !uploadsDisabled() && !!req.user && mfaOk(req.user as any),
    read: ({ req }) => {
      const u = req.user as any;
      if (!u || !mfaOk(u)) return false;
      if (can(u.role, 'file.read_any') || can(u.role, 'file.scan_result')) return true;
      return { owner: { equals: u.id } };
    },
    update: perm('file.scan_result'),
    delete: nobody,
  },
  fields: [
    { name: 'owner', type: 'relationship', relationTo: 'users', access: { create: () => false, update: () => false } },
    { name: 'scanStatus', type: 'select', defaultValue: 'PENDING', options: ['PENDING', 'CLEAN', 'INFECTED', 'REJECTED'], access: { create: () => false, update: scanFieldAccess } },
  ],
  hooks: {
    afterError: [exposeDomainErrorCodes],
    beforeOperation: [
      async ({ req, operation }) => {
        if (uploadsDisabled() && (operation === 'create' || req.file)) throw new BusinessRuleError('UPLOADS_DISABLED_IN_PREVIEW', 503);
        if ((operation === 'create' || operation === 'update') && req.file) {
          const cls = classifyUpload(req.file.name, req.file.data as Buffer);
          if (!cls.ok) throw new BusinessRuleError(`UPLOAD_REJECTED:${cls.reason}`, 415);
        }
      },
    ],
    beforeChange: [
      async ({ data, req, operation }) => {
        if (operation === 'create') {
          data.owner = req.user?.id;
          data.scanStatus = 'PENDING';
        }
        return data;
      },
    ],
  },
};
