import type { Locale } from './i18n.ts';
import { isBuilderServiceKey } from './builder-query.ts';
import { portfolioQuery, portfolioSearch } from './portfolio.ts';
import { isSmartHomePackageId, SMART_HOME_PACKAGE_IDS } from './smart-home-packages.ts';
import { isSimDemo } from './simulator/demo.ts';

const PACKAGE_HASH = new RegExp(`^#package-(?:${SMART_HOME_PACKAGE_IDS.join('|')})$`);

/**
 * Same page in `target` locale. Only allow-listed, validated state survives the switch; the query is
 * rebuilt from validated values and raw input is never echoed. Paths without a locale prefix go home.
 */
export function localeSwitchHref(pathname: string, search: string, hash: string, target: Locale): string {
  const match = /^\/(?:ar|en)(?=\/|$)(.*)$/.exec(pathname);
  if (!match) return `/${target}`;
  const rest = match[1];
  const params = new URLSearchParams(search);
  let query = '';
  let fragment = '';
  if (rest === '/projects') {
    query = portfolioSearch(portfolioQuery({ category: params.get('category'), q: params.get('q') }));
  } else if (rest === '/start-project') {
    const kept = new URLSearchParams();
    const packageValue = params.get('package')?.toLowerCase();
    if (isSmartHomePackageId(packageValue)) kept.set('package', packageValue);
    const serviceValue = params.get('service')?.toLowerCase();
    if (isBuilderServiceKey(serviceValue)) kept.set('service', serviceValue);
    query = kept.size ? `?${kept.toString()}` : '';
  } else if (rest === '/try') {
    // Only an allow-listed simulator demo preset survives the switch (design simDemo values).
    const demo = params.get('demo');
    query = isSimDemo(demo) && demo !== 'fresh' ? `?demo=${demo}` : '';
  } else if (rest === '/smart-home/packages' && PACKAGE_HASH.test(hash)) {
    fragment = hash;
  }
  return `/${target}${rest}${query}${fragment}`;
}
