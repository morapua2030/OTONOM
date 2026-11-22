import assert from 'node:assert/strict';
import { test } from 'node:test';
import { STAFF_ROLES } from '@otonom/domain';
import { ACCOUNT_PAGE, HIDDEN_PAGES, isCurrent, menuFor, NAV } from '../src/admin-ui/nav-model.ts';

/**
 * R3 menu by role (execution/evidence/r3-20261122/01-ADMIN-INVENTORY.md §2): a page shows when the role can work on it
 * (can(role, …)), a group when one of its pages shows; everyone has Home, Account security and Sign out.
 */
const EXPECTED: Record<(typeof STAFF_ROLES)[number], Array<[string, string[]]>> = {
  OWNER: [
    ['home', ['home']],
    ['bookings', ['leads', 'siteNumbers']],
    ['catalog', ['packages', 'controllers']],
    ['photos', ['media']],
    ['site', ['announcement', 'faqs', 'contact', 'simRoutines', 'simRules', 'privacy']],
    ['settings', ['bookingForm', 'users', 'reports', 'settings', 'hidden']],
  ],
  ADMIN: [
    ['home', ['home']],
    ['bookings', ['leads', 'siteNumbers']],
    ['catalog', ['packages', 'controllers']],
    ['photos', ['media']],
    ['site', ['announcement', 'faqs', 'contact', 'simRoutines', 'privacy']],
    ['settings', ['reports']],
  ],
  ENGINEER: [['home', ['home']]],
  STORE: [['home', ['home']]],
  EDITOR: [
    ['home', ['home']],
    ['catalog', ['packages', 'controllers']],
    ['photos', ['media']],
    ['site', ['announcement', 'faqs', 'contact', 'simRoutines', 'privacy']],
  ],
  SALES: [
    ['home', ['home']],
    ['bookings', ['leads', 'siteNumbers']],
  ],
};

test('the menu of every staff role equals the table', () => {
  for (const role of STAFF_ROLES) {
    const got = menuFor(role).map((g) => [g.key, g.pages.map((p) => p.key)]);
    assert.deepEqual(got, EXPECTED[role], role);
  }
});

test('SALES sees Home and Bookings only; nobody without a role sees anything', () => {
  assert.deepEqual(menuFor('SALES').map((g) => g.key), ['home', 'bookings']);
  assert.deepEqual(menuFor(undefined), []);
  assert.deepEqual(menuFor('CUSTOMER').map((g) => g.key), ['home']);
});

test('the 6 groups keep their order, names are unique, and Account security is for everyone', () => {
  assert.deepEqual(NAV.map((g) => g.key), ['home', 'bookings', 'catalog', 'photos', 'site', 'settings']);
  const hrefs = NAV.flatMap((g) => g.pages.map((p) => p.href));
  assert.equal(new Set(hrefs).size, hrefs.length);
  assert.equal(ACCOUNT_PAGE.perms, 'staff');
});

test('hidden pages are hidden from the menu only and listed (routes kept)', () => {
  const inMenu = new Set(NAV.flatMap((g) => g.pages.map((p) => p.href)));
  assert.equal(HIDDEN_PAGES.length, 14);
  for (const h of HIDDEN_PAGES) assert.equal(inMenu.has(h.href), false, h.href);
  for (const slug of ['pages', 'claims', 'case-studies', 'consents', 'organisations', 'contacts', 'rfqs', 'opportunities', 'private-files']) {
    assert.ok(HIDDEN_PAGES.some((h) => h.href === `/admin/collections/${slug}`), slug);
  }
  for (const view of ['/admin/workspace', '/admin/store-ops', '/admin/service-desk', '/admin/product-drafts', '/admin/content-review']) {
    assert.ok(HIDDEN_PAGES.some((h) => h.href === view), view);
  }
});

test('the current row follows the address (Home only for /admin and /admin/overview)', () => {
  const home = NAV[0].pages[0];
  const leads = NAV[1].pages[0];
  assert.equal(isCurrent(home, '/admin'), true);
  assert.equal(isCurrent(home, '/admin/overview'), true);
  assert.equal(isCurrent(home, '/admin/collections/leads'), false);
  assert.equal(isCurrent(leads, '/admin/collections/leads/12'), true);
  assert.equal(isCurrent(leads, '/admin/collections/leads-export'), false);
});
