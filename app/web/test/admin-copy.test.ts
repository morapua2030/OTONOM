import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as C from '../src/admin-ui/copy.ts';
import { dateTime, payloadDatePattern } from '../src/admin-ui/format.ts';

/**
 * R3 (owner 2026-11-22): every admin word lives in one copy file as { ar, en }; page lines are one sentence of at most
 * 12 words with no technical words; field help is at most 10 words; left-to-right runs inside Arabic are isolated;
 * dates use Western digits, Cairo time and the language's own comma.
 */
type Pair = { ar: string; en: string };
const isPair = (v: unknown): v is Pair => !!v && typeof v === 'object' && typeof (v as Pair).ar === 'string' && typeof (v as Pair).en === 'string' && Object.keys(v as object).length === 2;

function walk(value: unknown, path: string, out: Array<{ path: string; pair: Pair }>, seen = new Set<unknown>()) {
  if (!value || typeof value !== 'object' || seen.has(value)) return;
  seen.add(value);
  if (isPair(value)) {
    out.push({ path, pair: value });
    return;
  }
  for (const [k, v] of Object.entries(value)) walk(v, `${path}.${k}`, out, seen);
}
const all: Array<{ path: string; pair: Pair }> = [];
for (const [name, value] of Object.entries(C)) if (name !== 'PAYLOAD_TRANSLATIONS') walk(value, name, all);

const LRI = '⁦';
const PDI = '⁩';
const strip = (s: string) => s.replaceAll(LRI, '').replaceAll(PDI, '');
const banned = (s: string) => C.BANNED_WORDS.filter((w) => new RegExp(`(^|[^a-z])${w}([^a-z]|$)`, 'i').test(strip(s)));

test('every admin word has a non-empty Arabic and English side', () => {
  assert.ok(all.length > 300, `found ${all.length} pairs`);
  const empty = all.filter(({ pair }) => !pair.ar.trim() || !pair.en.trim()).map((x) => x.path);
  assert.deepEqual(empty, []);
});

test('every page line: one sentence, at most 12 words per language, no technical words', () => {
  for (const [key, page] of Object.entries(C.PAGE)) {
    for (const lang of ['ar', 'en'] as const) {
      const line = page.line[lang];
      assert.ok(C.wordCount(line) <= 12, `${key}.${lang}: ${C.wordCount(line)} words`);
      // one sentence: a full stop / question mark only at the very end
      assert.ok(!/[.!?؟](?=.)/.test(line.replace(/\.$/, '').replace(/\d\.\d/g, '')), `${key}.${lang} has more than one sentence: ${line}`);
      assert.deepEqual(banned(line), [], `${key}.${lang}`);
    }
  }
  for (const [key, h] of Object.entries(C.HIDDEN_COPY)) for (const lang of ['ar', 'en'] as const) assert.ok(C.wordCount(h.line[lang]) <= 12, `hidden ${key}.${lang}`);
});

test('status hints: one per status, at most 12 words, no technical words', () => {
  assert.deepEqual(Object.keys(C.LEAD_STATUS_COPY).sort(), ['CONTACTED', 'FOLLOW_UP', 'NEW', 'NOT_INTERESTED', 'QUOTED', 'VISIT_SCHEDULED']);
  for (const [key, s] of Object.entries(C.LEAD_STATUS_COPY)) {
    for (const lang of ['ar', 'en'] as const) {
      assert.ok(C.wordCount(s.hint[lang]) <= 12, `${key}.${lang}`);
      assert.deepEqual(banned(s.hint[lang]), [], `${key}.${lang}`);
    }
  }
});

test('field help: at most 10 words per language and no technical words', () => {
  const help = all.filter(({ path }) => /\.help$/.test(path) || /^(NOT_ON_SITE|INTERNAL)$/.test(path) || /^REVIEW_COPY\.help$/.test(path));
  assert.ok(help.length >= 40, `found ${help.length} help texts`);
  for (const { path, pair } of help) {
    for (const lang of ['ar', 'en'] as const) {
      assert.ok(C.wordCount(strip(pair[lang])) <= 10, `${path}.${lang}: ${C.wordCount(pair[lang])} words — ${pair[lang]}`);
      assert.deepEqual(banned(pair[lang]), [], `${path}.${lang}`);
    }
  }
});

test('Arabic text keeps phone formats, links and codes left-to-right (isolated, like <bdi dir="ltr">)', () => {
  for (const { path, pair } of all) {
    const ar = pair.ar;
    // a "+" sign before digits, an https:// link or a site path inside Arabic text must sit inside LRI … PDI
    for (const m of ar.matchAll(/\+\d|https:\/\/|\/ar\//g)) {
      const before = ar.slice(0, m.index);
      const open = before.lastIndexOf(LRI) > before.lastIndexOf(PDI);
      assert.ok(open, `${path}: «${m[0]}» is not isolated in «${ar}»`);
    }
  }
  assert.equal(C.LEAD_FIELDS.phone.help.ar.includes(`${LRI}+20…${PDI}`), true);
});

test('names in the menu are unique and at most 3 words', () => {
  const names = [...Object.values(C.GROUP), ...Object.entries(C.PAGE).filter(([k]) => k !== 'lead').map(([, p]) => p.name)];
  for (const lang of ['ar', 'en'] as const) {
    const pageNames = Object.entries(C.PAGE).filter(([k]) => k !== 'lead' && k !== 'home').map(([, p]) => p.name[lang]);
    assert.equal(new Set(pageNames).size, pageNames.length, `duplicate page names in ${lang}`);
    for (const n of names) assert.ok(C.wordCount(n[lang]) <= 3, `${n[lang]}`);
  }
  // the old duplicate: the booking form is not called "Booking requests" any more
  assert.notEqual(C.PAGE.bookingForm.name.en, C.PAGE.leads.name.en);
});

test('dates: Western digits, Cairo time, the language comma, and the time never splits from ص/م', () => {
  const at = '2026-11-22T13:05:00Z'; // 15:05 in Cairo
  const ar = dateTime(at, 'ar');
  const en = dateTime(at, 'en');
  assert.equal(/[٠-٩۰-۹]/.test(ar), false, ar);
  assert.ok(ar.includes('،') && !ar.includes(','), ar);
  assert.ok(ar.includes('3:05 م'), ar);
  assert.ok(en.includes(', 3:05 PM'), en);
  assert.equal(payloadDatePattern('ar'), 'd MMM yyyy، h:mm a');
  assert.equal(payloadDatePattern('en'), 'd MMM yyyy, h:mm a');
});
