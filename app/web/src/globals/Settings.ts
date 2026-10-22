import type { GlobalConfig } from 'payload';
import { perm, staffOnly } from '../lib/access.ts';
import { KPI_IDS } from '@otonom/domain';
import { auditRow } from '../lib/audit.ts';
import { BusinessRuleError } from '../lib/errors.ts';
import { commercialOperationsEnabled } from '../lib/server.ts';

export const Settings: GlobalConfig = {
  slug: 'settings',
  versions: { max: 100 },
  access: { read: staffOnly, update: perm('settings.stage') },
  fields: [
    { name: 'stage', type: 'select', required: true, defaultValue: 'PREVIEW', options: ['PREVIEW', 'COMMERCIAL'] },
    {
      name: 'northStarKpi',
      type: 'select',
      defaultValue: 'UNSELECTED',
      options: ['UNSELECTED', ...KPI_IDS],
      admin: { description: 'Primary KPI highlighted in reports — an OWNER decision (pending). Changing it never changes any KPI value.' },
    },
  ],
  hooks: {
    beforeChange: [
      ({ data }) => {
        if (data?.stage === 'COMMERCIAL' && !commercialOperationsEnabled()) throw new BusinessRuleError('COMMERCIAL_OPERATIONS_DISABLED', 503);
        return data;
      },
    ],
    afterChange: [
      async ({ doc, previousDoc, req }) => {
        // every PREVIEW ⇄ COMMERCIAL flip is audited (G-1: commerce must never be switched on silently)
        if (previousDoc?.stage !== doc.stage) await auditRow(req, 'settings.stage', 'settings', 'stage', { stage: previousDoc?.stage ?? null }, { stage: doc.stage });
        if ((previousDoc?.northStarKpi ?? 'UNSELECTED') !== (doc.northStarKpi ?? 'UNSELECTED'))
          await auditRow(req, 'settings.north_star', 'settings', 'northStarKpi', { northStarKpi: previousDoc?.northStarKpi ?? 'UNSELECTED' }, { northStarKpi: doc.northStarKpi });
        return doc;
      },
    ],
  },
};
