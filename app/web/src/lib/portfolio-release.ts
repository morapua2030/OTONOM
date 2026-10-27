import type { Discipline } from './portfolio.ts';

type Bilingual = { ar: string; en: string };
type ApprovedImage = { src: string; alt: Bilingual; caption?: Bilingual; width: number; height: number };
/** Reviewed publication metadata supplements the existing CMS without a database migration.
 * Add ONLY after the private content/rights ledger is approved. Never put evidence refs here.
 * CMS narrative, publication workflow and live consent remain authoritative. Withdrawal wins.
 */
export type PortfolioRelease = {
  slug: string; categories: Discipline[]; featured?: boolean;
  hero?: ApprovedImage; gallery?: ApprovedImage[];
  kind?: Bilingual; status?: Bilingual; timeframe?: Bilingual;
  journey?: { heading: Bilingual; body: Bilingual }[];
  engineering?: { heading: Bilingual; body: Bilingual }[];
};
// No project has a documented release approval yet. Product photos are NOT installation proof.
export const portfolioReleases: readonly PortfolioRelease[] = [];
