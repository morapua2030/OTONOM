import * as migration_20261014_080548_initial from './20261014_080548_initial';
import * as migration_20261014_185202_claims_governance from './20261014_185202_claims_governance';
import * as migration_20261014_225104_wave4_cms_hardening from './20261014_225104_wave4_cms_hardening';
import * as migration_20261014_230507_north_star_setting from './20261014_230507_north_star_setting';
import * as migration_20261015_000822_crm_lookup_indexes from './20261015_000822_crm_lookup_indexes';
import * as migration_20261016_111606_review_notes from './20261016_111606_review_notes';

export const migrations = [
  {
    up: migration_20261014_080548_initial.up,
    down: migration_20261014_080548_initial.down,
    name: '20261014_080548_initial',
  },
  {
    up: migration_20261014_185202_claims_governance.up,
    down: migration_20261014_185202_claims_governance.down,
    name: '20261014_185202_claims_governance',
  },
  {
    up: migration_20261014_225104_wave4_cms_hardening.up,
    down: migration_20261014_225104_wave4_cms_hardening.down,
    name: '20261014_225104_wave4_cms_hardening',
  },
  {
    up: migration_20261014_230507_north_star_setting.up,
    down: migration_20261014_230507_north_star_setting.down,
    name: '20261014_230507_north_star_setting',
  },
  {
    up: migration_20261015_000822_crm_lookup_indexes.up,
    down: migration_20261015_000822_crm_lookup_indexes.down,
    name: '20261015_000822_crm_lookup_indexes',
  },
  {
    up: migration_20261016_111606_review_notes.up,
    down: migration_20261016_111606_review_notes.down,
    name: '20261016_111606_review_notes'
  },
];
