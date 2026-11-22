import type { GlobalConfig } from 'payload';
import { perm, staffOnly } from '../lib/access.ts';
import { KPI_IDS } from '@otonom/domain';
import { auditRow } from '../lib/audit.ts';
import { BusinessRuleError } from '../lib/errors.ts';
import { commercialOperationsEnabled } from '../lib/server.ts';
import { GROUP, KPI_COPY, optionsOf, PAGE, SETTINGS_F, STAGE_COPY } from '../admin-ui/copy.ts';

export const Settings: GlobalConfig = {
  slug: 'settings',
  label: PAGE.settings.name,
  // owner 2026-11-15: the stage is shown read-only, with an explanation (the field rules are unchanged)
  admin: { group: GROUP.settings, description: PAGE.settings.line },
  versions: { max: 100 },
  access: { read: staffOnly, update: perm('settings.stage') },
  fields: [
    { name: 'stage', label: SETTINGS_F.stage.label, type: 'select', required: true, defaultValue: 'PREVIEW', options: optionsOf(['PREVIEW', 'COMMERCIAL'] as const, STAGE_COPY), admin: { readOnly: true, description: SETTINGS_F.stage.help } },
    {
      name: 'northStarKpi',
      label: SETTINGS_F.northStar.label,
      type: 'select',
      defaultValue: 'UNSELECTED',
      options: optionsOf(['UNSELECTED', ...KPI_IDS] as const, KPI_COPY),
      admin: { description: SETTINGS_F.northStar.help },
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
