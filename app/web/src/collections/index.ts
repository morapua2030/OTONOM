import type { CollectionConfig } from 'payload';
import { CaseStudies } from './CaseStudies.ts';
import { Claims } from './Claims.ts';
import { Consents } from './Consents.ts';
import { Contacts, Opportunities, Organisations, Rfqs } from './Crm.ts';
import { Media } from './Media.ts';
import { Pages } from './Pages.ts';
import { PrivateFiles } from './PrivateFiles.ts';
import { Users } from './Users.ts';
import { Leads } from './Leads.ts';
import { siteContentCollections } from './SiteContent.ts';

/** Single source of truth for Payload registration and generated-surface probes. */
export const collections: CollectionConfig[] = [
  Users,
  Pages,
  CaseStudies,
  Claims,
  Consents,
  Organisations,
  Contacts,
  Rfqs,
  Opportunities,
  PrivateFiles,
  Media,
  Leads,
  ...siteContentCollections,
];

export const collectionSlugs = collections.map((collection) => collection.slug);
